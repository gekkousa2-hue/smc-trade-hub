import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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

  /* ─── Auth ─── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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

  /* ─── Conversations ─── */
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (!data) { setLoadingConversations(false); return; }
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const { data: profile } = await supabase.from("profiles").select("user_id, username, avatar_url, is_online, last_seen").eq("user_id", otherUserId).single();
        const { data: lastMsg } = await supabase.from("messages").select("content, created_at, media_type").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).single();
        // Unread count
        const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conv.id).neq("sender_id", user.id).neq("status", "read" as any);
        let lastMsgText = lastMsg?.content;
        if (lastMsg) {
          const mt = (lastMsg as any).media_type;
          if (mt === "audio") lastMsgText = "🎤 Ovozli xabar";
          else if (mt === "video") lastMsgText = "🎥 Video xabar";
          else if (mt === "image") lastMsgText = "📷 Rasm";
          else if (mt === "file") lastMsgText = "📎 Fayl";
        }
        return { ...conv, other_user: profile as any || undefined, last_message: lastMsgText, last_message_at: lastMsg?.created_at, unread_count: count || 0 } as Conversation;
      })
    );
    setConversations(enriched);
    setLoadingConversations(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

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
        setMessages(prev => [...reversed, ...prev]);
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setMessages(reversed);
        setHasMore(data.length === PAGE_SIZE);
      }
    }
    setLoadingMessages(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    setHasMore(true);
    fetchMessages(activeConversationId);
  }, [activeConversationId, fetchMessages]);

  const loadMoreMessages = useCallback(() => {
    if (!activeConversationId || isLoadingMore || !hasMore || messages.length === 0) return;
    fetchMessages(activeConversationId, messages[0].created_at);
  }, [activeConversationId, isLoadingMore, hasMore, messages, fetchMessages]);

  /* ─── Mark messages as read ─── */
  useEffect(() => {
    if (!activeConversationId || !user) return;
    const markRead = async () => {
      await supabase
        .from("messages")
        .update({ status: "read" } as any)
        .eq("conversation_id", activeConversationId)
        .neq("sender_id", user.id)
        .neq("status", "read" as any);
    };
    markRead();
  }, [activeConversationId, user, messages]);

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
        if (tempToRealId.current.has(newId)) {
          tempToRealId.current.delete(newId);
          return;
        }
        const { data: profile } = await supabase.from("profiles").select("username, avatar_url").eq("user_id", payload.new.sender_id).single();
        const newMsg: Message = { ...(payload.new as any), profiles: profile };
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Mark as read if from other user
        if (user && payload.new.sender_id !== user.id) {
          await supabase.from("messages").update({ status: "read" } as any).eq("id", newId);
        }
        fetchConversations();
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
        fetchConversations();
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
  }, [activeConversationId, fetchConversations, user]);

  /* ─── Real-time conversations ─── */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

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

  const sendMessage = async (e?: React.FormEvent, mediaUrl?: string, mediaType?: string) => {
    if (e) e.preventDefault();
    const content = newMessage.trim();
    if (!content && !mediaUrl) return;
    if (!user || !activeConversationId) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
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
      reply_to_id: replyTo?.id || null,
      reply_to: replyTo,
      profiles: null,
    };
    setSendingIds(prev => new Set(prev).add(tempId));
    setMessages(prev => [...prev, optimisticMsg]);
    setReplyTo(null);

    try {
      const insertData: any = {
        sender_id: user.id,
        conversation_id: activeConversationId,
        content: content || "",
        status: "sent",
      };
      if (mediaUrl) { insertData.media_url = mediaUrl; insertData.media_type = mediaType; }
      if (replyTo) insertData.reply_to_id = replyTo.id;
      const { data, error } = await supabase.from("messages").insert(insertData).select("id").single();
      if (error) throw error;
      tempToRealId.current.set(data.id, tempId);
      setSendingIds(prev => { const s = new Set(prev); s.delete(tempId); return s; });
      setConfirmedIds(prev => new Set(prev).add(tempId));
      setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, id: data.id, status: "sent" } : m)));
      setConfirmedIds(prev => { const s = new Set(prev); s.delete(tempId); s.add(data.id); return s; });
      fetchConversations();
    } catch (err) {
      setSendingIds(prev => { const s = new Set(prev); s.delete(tempId); return s; });
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error("Xabar yuborishda xatolik:", err);
    }
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
    togglePin, replyToMessage, loadMoreMessages, handleTyping, fetchConversations,
    setSendingIds, setConfirmedIds, setMessages,
  };
}
