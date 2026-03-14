import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Send, LogOut, ArrowLeft, Search, MessageCircle, X, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_user?: Profile;
  last_message?: string;
  last_message_at?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  conversation_id: string | null;
  profiles?: { username: string; avatar_url: string | null } | null;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (!data) return;

    // Fetch other user profiles and last messages
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .eq("user_id", otherUserId)
          .single();

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...conv,
          other_user: profile || undefined,
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
        } as Conversation;
      })
    );

    setConversations(enriched);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(username, avatar_url)")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();
  }, [activeConversationId]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", payload.new.sender_id)
            .single();

          const newMsg: Message = {
            ...(payload.new as Message),
            profiles: profile,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  // Real-time subscription for new conversations
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .ilike("username", `%${searchQuery}%`)
        .neq("user_id", user.id)
        .limit(10);
      setSearchResults(data || []);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  // Open or create conversation with a user
  const openConversation = async (otherUserId: string) => {
    if (!user) return;

    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      other_user_id: otherUserId,
    });

    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }

    setActiveConversationId(data as string);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setShowSidebar(false);
    fetchConversations();
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeConversationId) return;

    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      content,
      sender_id: user.id,
      conversation_id: activeConversationId,
    });

    fetchConversations();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const getAvatarColor = (id: string) => {
    const colors = [
      "bg-primary/80",
      "bg-[hsl(142_60%_45%/0.8)]",
      "bg-[hsl(0_72%_55%/0.8)]",
      "bg-[hsl(210_80%_55%/0.8)]",
      "bg-[hsl(270_60%_55%/0.8)]",
      "bg-[hsl(330_60%_55%/0.8)]",
    ];
    return colors[id.charCodeAt(0) % colors.length];
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden md:flex"
        } w-full md:w-80 flex-col border-r border-border/50 glass`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="font-display text-lg font-bold text-foreground">Xabarlar</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(!!e.target.value);
              }}
              placeholder="Foydalanuvchi qidirish..."
              className="w-full rounded-lg bg-secondary pl-9 pr-8 py-2 text-sm text-foreground outline-none ring-1 ring-border transition-all focus:ring-primary placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearching(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results / Conversations List */}
        <ScrollArea className="flex-1">
          {isSearching ? (
            <div className="px-2 py-1">
              <p className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Natijalar
              </p>
              {searchResults.length === 0 && searchQuery.trim() && (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Topilmadi
                </p>
              )}
              {searchResults.map((profile) => (
                <button
                  key={profile.user_id}
                  onClick={() => openConversation(profile.user_id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(profile.user_id)}`}
                  >
                    {getInitials(profile.username)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{profile.username}</p>
                    <p className="text-xs text-muted-foreground">Xabar yozish</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-1">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Hali chatlar yo'q</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Yuqoridagi qidiruvdan foydalaning
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setShowSidebar(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      activeConversationId === conv.id
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(conv.other_user?.user_id || "")}`}
                    >
                      {getInitials(conv.other_user?.username || "?")}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {conv.other_user?.username || "Noma'lum"}
                        </p>
                        {conv.last_message_at && (
                          <span className="font-mono text-[10px] text-muted-foreground/60 ml-2 shrink-0">
                            {new Date(conv.last_message_at).toLocaleTimeString("uz", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div
        className={`${
          !showSidebar ? "flex" : "hidden md:flex"
        } flex-1 flex-col`}
      >
        {activeConversationId && activeConversation ? (
          <>
            {/* Chat Header */}
            <header className="glass sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <button
                onClick={() => setShowSidebar(true)}
                className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(activeConversation.other_user?.user_id || "")}`}
              >
                {getInitials(activeConversation.other_user?.username || "?")}
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">
                  {activeConversation.other_user?.username || "Noma'lum"}
                </h2>
                <p className="font-mono text-[10px] text-muted-foreground">Shaxsiy chat</p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Salomlashing! 👋
                  </p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const username = msg.profiles?.username || "Noma'lum";

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${getAvatarColor(msg.sender_id)}`}
                      >
                        {getInitials(username)}
                      </div>
                      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                            isOwn
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm glass"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
                          {new Date(msg.created_at).toLocaleTimeString("uz", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="glass border-t border-border/50 px-4 py-3">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Xabar yozing..."
                  className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border transition-all focus:ring-primary placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mb-1">
              Chatni tanlang
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Chap tomondagi ro'yxatdan chat tanlang yoki yangi foydalanuvchini qidiring
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
