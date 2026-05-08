import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { chatCache } from "@/lib/chatCache";

/* ─── Types ─── */
export interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_online?: boolean;
  last_seen?: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_user?: Profile;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  conversation_id: string | null;
  media_url?: string | null;
  media_type?: string | null;
  status?: string;
  reply_to_id?: string | null;
  is_pinned?: boolean;
  edited_at?: string | null;
  profiles?: { username: string; avatar_url: string | null } | null;
  reply_to?: Message | null;
  failed?: boolean;
  _retryPayload?: { content: string; mediaUrl?: string | null; mediaType?: string | null; replyToId?: string | null };
}

// Sort & dedupe helper — guarantees correct order and no duplicates
function mergeMessages(prev: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) {
    const existing = map.get(m.id);
    map.set(m.id, existing ? { ...existing, ...m } : m);
  }
  return Array.from(map.values()).sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

const PAGE_SIZE = 20;

export function useChatState() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio" | "video" | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const tempToRealId = useRef<Map<string, string>>(new Map());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  /* ─── Auth ─── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") chatCache.clearAll();
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ─── Online presence ─── */
  useEffect(() => {
    if (!user) return;
    const updatePresence = async (online: boolean) => {
      await supabase.from("profiles").update({
        is_online: online,
        last_seen: new Date().toISOString(),
      } as any).eq("user_id", user.id);
    };
    updatePresence(true);
    const interval = setInterval(() => updatePresence(true), 60000);
    const handleVisibility = () => updatePresence(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    const handleBeforeUnload = () => updatePresence(false);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updatePresence(false);
    };
  }, [user]);

  /* ─── Conversations (batched, no N+1) ─── */
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoadingConversations(false);
      chatCache.setConversations(user.id, []);
      return;
    }

    const otherIds = Array.from(new Set(convs.map(c => (c.user1_id === user.id ? c.user2_id : c.user1_id))));
    const convIds = convs.map(c => c.id);

    // Batch profiles + recent messages in parallel
    const [profilesRes, msgsRes, unreadRes] = await Promise.all([
      supabase.from("profiles").select("user_id, username, avatar_url, is_online, last_seen").in("user_id", otherIds),
      supabase.from("messages").select("conversation_id, content, media_type, created_at").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(200),
      supabase.from("messages").select("conversation_id, status, sender_id").in("conversation_id", convIds).neq("sender_id", user.id).neq("status", "read"),
    ]);

    const profileMap = new Map<string, any>();
    (profilesRes.data || []).forEach(p => profileMap.set(p.user_id, p));

    const lastMsgMap = new Map<string, any>();
    (msgsRes.data || []).forEach((m: any) => {
      if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
    });

    const unreadMap = new Map<string, number>();
    (unreadRes.data || []).forEach((m: any) => {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
    });

    const enriched: Conversation[] = convs.map(conv => {
      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const lastMsg = lastMsgMap.get(conv.id);
      let lastMsgText = lastMsg?.content;
      if (lastMsg) {
        const mt = lastMsg.media_type;
        if (mt === "audio") lastMsgText = "🎤 Ovozli xabar";
        else if (mt === "video") lastMsgText = "🎥 Video xabar";
        else if (mt === "image") lastMsgText = "📷 Rasm";
        else if (mt === "file") lastMsgText = "📎 Fayl";
      }
      return {
        ...conv,
        other_user: profileMap.get(otherUserId),
        last_message: lastMsgText,
        last_message_at: lastMsg?.created_at,
        unread_count: unreadMap.get(conv.id) || 0,
      } as Conversation;
    });
    setConversations(enriched);
    setLoadingConversations(false);
    chatCache.setConversations(user.id, enriched);
  }, [user]);

  /* ─── Hydrate conversations from cache instantly on user change ─── */
  useEffect(() => {
    if (!user) return;
    const cached = chatCache.getConversations(user.id);
    if (cached && cached.length > 0) {
      setConversations(cached);
      setLoadingConversations(false);
    }
    fetchConversations();
  }, [user, fetchConversations]);

  /* ─── Messages fetch (paginated) ─── */
  const fetchMessages = useCallback(async (conversationId: string, before?: string) => {
    if (!conversationId) return;
    if (!before) setLoadingMessages(true);
    else setIsLoadingMore(true);

    let query = supabase
      .from("messages")
      .select("*, profiles(username, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data } = await query;
    if (data) {
      const reversed = [...data].reverse() as Message[];
      if (before) {
        setMessages(prev => {
          const merged = mergeMessages(prev, reversed);
          return merged;
        });
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setMessages(prev => {
          // Merge with any cached/optimistic messages already in state
          const merged = mergeMessages(prev, reversed);
          chatCache.setMessages(conversationId, merged);
          return merged;
        });
        setHasMore(data.length === PAGE_SIZE);
      }
    }
    setLoadingMessages(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    if (!activeConversationId) { setMessages([]); return; }
    setHasMore(true);
    // Instant hydrate from cache
    const cached = chatCache.getMessages(activeConversationId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setLoadingMessages(false);
    } else {
      setMessages([]);
    }
    // Fetch fresh in background
    fetchMessages(activeConversationId);
  }, [activeConversationId, fetchMessages]);

  /* ─── Persist messages to cache whenever they change ─── */
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;
    chatCache.setMessages(activeConversationId, messages);
  }, [activeConversationId, messages]);

  const loadMoreMessages = useCallback(() => {
    if (!activeConversationId || isLoadingMore || !hasMore || messages.length === 0) return;
    fetchMessages(activeConversationId, messages[0].created_at);
  }, [activeConversationId, isLoadingMore, hasMore, messages, fetchMessages]);

  /* ─── Mark messages as read (only when opening / new arrives) ─── */
  useEffect(() => {
    if (!activeConversationId || !user) return;
    let cancelled = false;
    const markRead = async () => {
      if (cancelled) return;
      await supabase
        .from("messages")
        .update({ status: "read" } as any)
        .eq("conversation_id", activeConversationId)
        .neq("sender_id", user.id)
        .neq("status", "read" as any);
    };
    markRead();
    return () => { cancelled = true; };
  }, [activeConversationId, user]);

  /* ─── Real-time messages ─── */
  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, async (payload) => {
        const newId = payload.new.id as string;
        // If we already have this real ID (from optimistic-replace), ignore
        const tempId = tempToRealId.current.get(newId);
        if (tempId) {
          tempToRealId.current.delete(newId);
          return;
        }
        const senderId = payload.new.sender_id as string;
        let profile = null;
        if (user && senderId !== user.id) {
          const { data } = await supabase.from("profiles").select("username, avatar_url").eq("user_id", senderId).single();
          profile = data;
        }
        const newMsg: Message = { ...(payload.new as any), profiles: profile };
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return mergeMessages(prev, [newMsg]);
        });
        // If from other user → mark as delivered immediately, then read (since chat is open)
        if (user && senderId !== user.id) {
          // Fire-and-forget — don't block UI
          supabase.from("messages").update({ status: "read" } as any).eq("id", newId).then();
        }
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        setMessages(prev => prev.map(m =>
          m.id === (payload.new as any).id
            ? { ...m, content: (payload.new as any).content, status: (payload.new as any).status, edited_at: (payload.new as any).edited_at, is_pinned: (payload.new as any).is_pinned }
            : m
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, user]);

  /* ─── Real-time sidebar refresh (debounced, INSERT-only to avoid loops) ─── */
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedFetchConversations = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => fetchConversations(), 600);
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`global-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => debouncedFetchConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => debouncedFetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, debouncedFetchConversations]);

  /* ─── Typing indicator ─── */
  useEffect(() => {
    if (!activeConversationId || !user) return;
    const channel = supabase
      .channel(`typing-${activeConversationId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "typing_indicators",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        const data = payload.new as any;
        if (data && data.user_id !== user.id) {
          setOtherTyping(!!data.is_typing);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, user]);

  const sendTyping = useCallback(async (typing: boolean) => {
    if (!activeConversationId || !user) return;
    await supabase.from("typing_indicators").upsert({
      conversation_id: activeConversationId,
      user_id: user.id,
      is_typing: typing,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "conversation_id,user_id" });
  }, [activeConversationId, user]);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 2000);
  }, [isTyping, sendTyping]);

  /* ─── Search (debounced) ─── */
  useEffect(() => {
    if (!searchQuery.trim() || !user) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, is_online, last_seen")
        .ilike("username", `%${searchQuery}%`)
        .neq("user_id", user.id)
        .limit(10);
      setSearchResults((data as any) || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  /* ─── Close context menu on outside click ─── */
  useEffect(() => {
    if (!contextMenuMsgId) return;
    const handler = () => setContextMenuMsgId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenuMsgId]);

  /* ─── Actions ─── */
  const openConversation = async (otherUserId: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc("get_or_create_conversation", { other_user_id: otherUserId });
    if (error) { console.error("Error:", error); return; }
    setActiveConversationId(data as string);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setShowSidebar(false);
    fetchConversations();
  };

  const uploadMedia = async (file: Blob, ext: string) => {
    if (!user) return null;
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  // Internal: persist a message with retry/backoff
  const persistMessage = async (
    tempId: string,
    payload: { content: string; mediaUrl?: string | null; mediaType?: string | null; replyToId?: string | null },
    convId: string
  ) => {
    if (!user) return;
    const insertData: any = {
      sender_id: user.id,
      conversation_id: convId,
      content: payload.content || "",
      status: "sent",
    };
    if (payload.mediaUrl) { insertData.media_url = payload.mediaUrl; insertData.media_type = payload.mediaType; }
    if (payload.replyToId) insertData.reply_to_id = payload.replyToId;

    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const { data, error } = await supabase.from("messages").insert(insertData).select("id, created_at").single();
        if (error) throw error;
        tempToRealId.current.set(data.id, tempId);
        setSendingIds(prev => { const s = new Set(prev); s.delete(tempId); return s; });
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, id: data.id, status: "sent", created_at: data.created_at, failed: false, _retryPayload: undefined } : m
        ));
        return;
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          setSendingIds(prev => { const s = new Set(prev); s.delete(tempId); return s; });
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, status: "failed", failed: true, _retryPayload: payload } : m
          ));
          console.error("Xabar yuborishda xatolik (3 urinishdan keyin):", err);
          return;
        }
        await new Promise(r => setTimeout(r, 400 * attempt * attempt));
      }
    }
  };

  const sendMessage = async (e?: React.FormEvent, mediaUrl?: string, mediaType?: string) => {
    if (e) e.preventDefault();
    const content = newMessage.trim();
    if (!content && !mediaUrl) return;
    if (!user || !activeConversationId) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const currentReplyTo = replyTo;
    setNewMessage("");
    setShowEmoji(false);
    sendTyping(false);
    setIsTyping(false);

    const optimisticMsg: Message = {
      id: tempId,
      content: content || (mediaType === "audio" ? "🎤" : mediaType === "video" ? "🎥" : "📎"),
      sender_id: user.id,
      created_at: new Date().toISOString(),
      conversation_id: activeConversationId,
      media_url: mediaUrl,
      media_type: mediaType,
      status: "sending",
      reply_to_id: currentReplyTo?.id || null,
      reply_to: currentReplyTo,
      profiles: null,
    };
    setSendingIds(prev => new Set(prev).add(tempId));
    setMessages(prev => mergeMessages(prev, [optimisticMsg]));
    setReplyTo(null);

    await persistMessage(tempId, {
      content,
      mediaUrl,
      mediaType,
      replyToId: currentReplyTo?.id || null,
    }, activeConversationId);
  };

  const retryMessage = async (tempId: string) => {
    const msg = messages.find(m => m.id === tempId);
    if (!msg || !msg._retryPayload || !msg.conversation_id) return;
    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "sending", failed: false } : m));
    setSendingIds(prev => new Set(prev).add(tempId));
    await persistMessage(tempId, msg._retryPayload, msg.conversation_id);
  };

  const deleteMessage = async (msgId: string) => {
    setContextMenuMsgId(null);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await supabase.from("messages").delete().eq("id", msgId);
    fetchConversations();
  };

  const startEditing = (msg: Message) => {
    setContextMenuMsgId(null);
    setEditingMsgId(msg.id);
    setEditContent(msg.content);
  };

  const saveEdit = async () => {
    if (!editingMsgId || !editContent.trim()) return;
    const newContent = editContent.trim();
    setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m));
    setEditingMsgId(null);
    setEditContent("");
    await supabase.from("messages").update({ content: newContent, edited_at: new Date().toISOString() } as any).eq("id", editingMsgId);
  };

  const cancelEdit = () => { setEditingMsgId(null); setEditContent(""); };

  const togglePin = async (msgId: string) => {
    setContextMenuMsgId(null);
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const newPinned = !msg.is_pinned;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: newPinned } : m));
    await supabase.from("messages").update({ is_pinned: newPinned } as any).eq("id", msgId);
  };

  const replyToMessage = (msg: Message) => {
    setContextMenuMsgId(null);
    setReplyTo(msg);
  };

  return {
    user, conversations, activeConversationId, messages, newMessage, searchQuery, searchResults,
    isSearching, showSidebar, sendingIds, confirmedIds, showEmoji, isRecording, recordingType,
    recordingTime, showAttachMenu, contextMenuMsgId, contextMenuPos, editingMsgId, editContent,
    replyTo, isLoadingMore, hasMore, otherTyping, loadingConversations, loadingMessages,
    // Setters
    setActiveConversationId, setNewMessage, setSearchQuery, setIsSearching, setShowSidebar,
    setShowEmoji, setIsRecording, setRecordingType, setRecordingTime, setShowAttachMenu,
    setContextMenuMsgId, setContextMenuPos, setEditingMsgId, setEditContent, setReplyTo,
    // Actions
    openConversation, uploadMedia, sendMessage, deleteMessage, startEditing, saveEdit, cancelEdit,
    togglePin, replyToMessage, loadMoreMessages, handleTyping, fetchConversations, retryMessage,
    setSendingIds, setConfirmedIds, setMessages,
  };
}
