import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ArrowLeft,
  Search,
  MessageSquare,
  X,
  Check,
  CheckCheck,
  MessagesSquare,
  Paperclip,
  Mic,
  MicOff,
  Smile,
  Play,
  Pause,
  Image as ImageIcon,
  FileText,
  Video,
  Bot,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

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
  media_url?: string | null;
  media_type?: string | null;
  profiles?: { username: string; avatar_url: string | null } | null;
  isAI?: boolean;
  aiAnalysis?: AIAnalysis | null;
  isAIThinking?: boolean;
}

interface AIAnalysis {
  raw: string;
  signal?: string;
  structure?: string;
  recommendation?: string;
  entry?: string;
  target?: string;
  stopLoss?: string;
}

const EMOJI_LIST = [
  "😀","😂","🤣","😍","🥰","😎","🤔","😢","😡","👍",
  "👎","🔥","💰","📈","📉","💎","🚀","💪","🎯","⚡",
  "✅","❌","⭐","💥","🏆","🤝","👏","🙏","💵","📊",
];

const TRADE_AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trade-ai`;

function parseAIAnalysis(raw: string): AIAnalysis {
  const analysis: AIAnalysis = { raw };
  const signalMatch = raw.match(/Signal[:\s]*\*?\*?\s*(BUY|SELL|WAIT|Buy|Sell|Wait)/i);
  if (signalMatch) analysis.signal = signalMatch[1].toUpperCase();

  const structMatch = raw.match(/SMC Struktura[:\s]*\*?\*?\s*(.+?)(?:\n|$)/i);
  if (structMatch) analysis.structure = structMatch[1].replace(/\*+/g, "").trim();

  const recMatch = raw.match(/Tavsiya[:\s]*\*?\*?\s*(.+?)(?:\n|$)/i);
  if (recMatch) analysis.recommendation = recMatch[1].replace(/\*+/g, "").trim();

  const entryMatch = raw.match(/Kirish nuqtasi[:\s]*\*?\*?\s*(.+?)(?:\n|$)/i);
  if (entryMatch) analysis.entry = entryMatch[1].replace(/\*+/g, "").trim();

  const targetMatch = raw.match(/Target[:\s]*\*?\*?\s*(.+?)(?:\n|$)/i);
  if (targetMatch) analysis.target = targetMatch[1].replace(/\*+/g, "").trim();

  const slMatch = raw.match(/Stop Loss[:\s]*\*?\*?\s*(.+?)(?:\n|$)/i);
  if (slMatch) analysis.stopLoss = slMatch[1].replace(/\*+/g, "").trim();

  return analysis;
}

function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary transition-colors hover:bg-primary/30">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">{fmt(progress)} / {duration ? fmt(duration) : "0:00"}</span>
      </div>
    </div>
  );
}

function VideoMessage({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); } else { videoRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="relative w-40 h-40 rounded-full overflow-hidden cursor-pointer border-2 border-primary/40" onClick={toggle}>
      <video ref={videoRef} src={src} className="w-full h-full object-cover" playsInline loop
        onEnded={() => setPlaying(false)} />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30">
          <Play className="h-8 w-8 text-primary drop-shadow" />
        </div>
      )}
    </div>
  );
}

function AIAnalysisCard({ analysis }: { analysis: AIAnalysis }) {
  const signalColor = analysis.signal === "BUY"
    ? "text-[hsl(142_60%_50%)]"
    : analysis.signal === "SELL"
    ? "text-destructive"
    : "text-primary";

  const signalBg = analysis.signal === "BUY"
    ? "bg-[hsl(142_60%_50%)]/10 border-[hsl(142_60%_50%)]/30"
    : analysis.signal === "SELL"
    ? "bg-destructive/10 border-destructive/30"
    : "bg-primary/10 border-primary/30";

  return (
    <Card className="bg-background/60 backdrop-blur-md border-primary/20 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      <CardContent className="p-3.5 space-y-2.5">
        {analysis.signal && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${signalBg} ${signalColor}`}>
            📊 Signal: {analysis.signal}
          </div>
        )}
        {analysis.structure && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">🏗 SMC Struktura</p>
            <p className="text-sm text-foreground">{analysis.structure}</p>
          </div>
        )}
        {analysis.recommendation && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">💡 Tavsiya</p>
            <p className="text-sm text-foreground">{analysis.recommendation}</p>
          </div>
        )}
        {analysis.entry && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">📈 Kirish nuqtasi</p>
            <p className="text-sm text-foreground font-mono">{analysis.entry}</p>
          </div>
        )}
        <div className="flex gap-3">
          {analysis.target && (
            <div className="flex-1 space-y-0.5">
              <p className="text-[10px] font-mono text-[hsl(142_60%_50%)] uppercase tracking-wider">🎯 Target</p>
              <p className="text-sm text-foreground font-mono">{analysis.target}</p>
            </div>
          )}
          {analysis.stopLoss && (
            <div className="flex-1 space-y-0.5">
              <p className="text-[10px] font-mono text-destructive uppercase tracking-wider">🛡 Stop Loss</p>
              <p className="text-sm text-foreground font-mono">{analysis.stopLoss}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AIThinkingBubble() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="max-w-[78%] flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-mono text-primary/80 mb-0.5 font-bold">Trade-AI</span>
          <div className="rounded-2xl rounded-bl-sm bg-secondary/70 border border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">O'ylamoqda...</span>
              <div className="flex gap-0.5">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
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
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio" | "video" | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tempToRealId = useRef<Map<string, string>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });
    if (!data) return;
    const enriched = await Promise.all(
      data.map(async (conv) => {
        const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const { data: profile } = await supabase.from("profiles").select("user_id, username, avatar_url").eq("user_id", otherUserId).single();
        const { data: lastMsg } = await supabase.from("messages").select("content, created_at, media_type").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).single();
        let lastMsgText = lastMsg?.content;
        if (lastMsg && (lastMsg as any).media_type === "audio") lastMsgText = "🎤 Ovozli xabar";
        else if (lastMsg && (lastMsg as any).media_type === "video") lastMsgText = "🎥 Video xabar";
        else if (lastMsg && (lastMsg as any).media_type === "image") lastMsgText = "📷 Rasm";
        else if (lastMsg && (lastMsg as any).media_type === "file") lastMsgText = "📎 Fayl";
        return { ...conv, other_user: profile || undefined, last_message: lastMsgText, last_message_at: lastMsg?.created_at } as Conversation;
      })
    );
    setConversations(enriched);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    const fetchMessages = async () => {
      const { data } = await supabase.from("messages").select("*, profiles(username, avatar_url)").eq("conversation_id", activeConversationId).order("created_at", { ascending: true }).limit(200);
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase.channel(`messages-${activeConversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, async (payload) => {
      const newId = payload.new.id as string;
      if (tempToRealId.current.has(newId)) { tempToRealId.current.delete(newId); return; }
      const { data: profile } = await supabase.from("profiles").select("username, avatar_url").eq("user_id", payload.new.sender_id).single();
      const newMsg: Message = { ...(payload.new as Message), profiles: profile };
      setMessages((prev) => { if (prev.some((m) => m.id === newMsg.id)) return prev; return [...prev, newMsg]; });
      fetchConversations();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, fetchConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("conversations-realtime").on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => fetchConversations()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, aiThinking]);

  useEffect(() => {
    if (!searchQuery.trim() || !user) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("user_id, username, avatar_url").ilike("username", `%${searchQuery}%`).neq("user_id", user.id).limit(10);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  const openConversation = async (otherUserId: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc("get_or_create_conversation", { other_user_id: otherUserId });
    if (error) { console.error("Error:", error); return; }
    setActiveConversationId(data as string);
    setSearchQuery(""); setSearchResults([]); setIsSearching(false); setShowSidebar(false);
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

    const optimisticMsg: Message = {
      id: tempId, content: content || (mediaType === "audio" ? "🎤" : mediaType === "video" ? "🎥" : "📎"),
      sender_id: user.id, created_at: new Date().toISOString(), conversation_id: activeConversationId,
      media_url: mediaUrl, media_type: mediaType, profiles: null,
    };
    setSendingIds((prev) => new Set(prev).add(tempId));
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const insertData: any = { sender_id: user.id, conversation_id: activeConversationId, content: content || "" };
      if (mediaUrl) { insertData.media_url = mediaUrl; insertData.media_type = mediaType; }
      const { data, error } = await supabase.from("messages").insert(insertData).select("id").single();
      if (error) throw error;
      tempToRealId.current.set(data.id, tempId);
      setSendingIds((prev) => { const s = new Set(prev); s.delete(tempId); return s; });
      setConfirmedIds((prev) => new Set(prev).add(tempId));
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: data.id } : m)));
      setConfirmedIds((prev) => { const s = new Set(prev); s.delete(tempId); s.add(data.id); return s; });
      fetchConversations();
    } catch (err) {
      setSendingIds((prev) => { const s = new Set(prev); s.delete(tempId); return s; });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("Xabar yuborishda xatolik:", err);
    }
  };

  const sendAIRequest = async (imageUrl?: string, textMessage?: string) => {
    if (!user) return;
    setAiThinking(true);
    setAiMode(false);
    setAiImageUrl(null);

    try {
      const resp = await fetch(TRADE_AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageUrl, message: textMessage }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Xatolik" }));
        throw new Error(errData.error || "AI xizmati xatosi");
      }

      const data = await resp.json();
      const analysis = parseAIAnalysis(data.content);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        content: data.content,
        sender_id: "trade-ai",
        created_at: new Date().toISOString(),
        conversation_id: activeConversationId,
        isAI: true,
        aiAnalysis: analysis,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI error:", err);
      const errMsg: Message = {
        id: `ai-err-${Date.now()}`,
        content: `⚠️ ${err instanceof Error ? err.message : "AI xizmati bilan bog'lanishda xatolik"}`,
        sender_id: "trade-ai",
        created_at: new Date().toISOString(),
        conversation_id: activeConversationId,
        isAI: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setAiThinking(false);
    }
  };

  const handleAIImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "png";
    const url = await uploadMedia(file, ext);
    if (url) {
      setAiImageUrl(url);
    }
    if (aiFileInputRef.current) aiFileInputRef.current.value = "";
  };

  const handleAISend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text && !aiImageUrl) return;
    setNewMessage("");
    await sendAIRequest(aiImageUrl || undefined, text || undefined);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setShowAttachMenu(false);
    const ext = file.name.split(".").pop() || "file";
    const isImage = file.type.startsWith("image/");
    const url = await uploadMedia(file, ext);
    if (url) await sendMessage(undefined, url, isImage ? "image" : "file");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async (type: "audio" | "video") => {
    try {
      const constraints: MediaStreamConstraints = type === "audio" ? { audio: true } : { audio: true, video: { facingMode: "user", width: 320, height: 320 } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (type === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      const recorder = new MediaRecorder(stream, { mimeType: type === "audio" ? "audio/webm" : "video/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: type === "audio" ? "audio/webm" : "video/webm" });
        const url = await uploadMedia(blob, "webm");
        if (url) await sendMessage(undefined, url, type);
        stopStreamTracks();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingType(type);
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordingType(null);
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    stopStreamTracks();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordingType(null);
    setRecordingTime(0);
  };

  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
  const getAvatarColor = (id: string) => {
    const colors = ["from-primary/90 to-primary/50", "from-[hsl(142_60%_45%)] to-[hsl(142_60%_35%)]", "from-[hsl(210_80%_55%)] to-[hsl(210_80%_40%)]", "from-[hsl(270_60%_55%)] to-[hsl(270_60%_40%)]", "from-[hsl(330_60%_55%)] to-[hsl(330_60%_40%)]", "from-[hsl(20_80%_55%)] to-[hsl(20_80%_40%)]"];
    return colors[id.charCodeAt(0) % colors.length];
  };
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" });
  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const renderMessageContent = (msg: Message) => {
    if (msg.aiAnalysis) return <AIAnalysisCard analysis={msg.aiAnalysis} />;
    if (msg.isAI) return <p className="text-sm">{msg.content}</p>;
    if (msg.media_type === "audio" && msg.media_url) return <AudioPlayer src={msg.media_url} />;
    if (msg.media_type === "video" && msg.media_url) return <VideoMessage src={msg.media_url} />;
    if (msg.media_type === "image" && msg.media_url) return (
      <div className="space-y-1.5">
        <img src={msg.media_url} alt="media" className="rounded-xl max-w-[240px] max-h-[240px] object-cover" loading="lazy" />
        {msg.content && <p>{msg.content}</p>}
      </div>
    );
    if (msg.media_type === "file" && msg.media_url) return (
      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline decoration-primary/40">
        <FileText className="h-4 w-4" /> {msg.content || "Fayl"}
      </a>
    );
    return <>{msg.content}</>;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className={`${showSidebar ? "flex" : "hidden md:flex"} w-full md:w-80 flex-col border-r border-border/30`}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
          <MessagesSquare className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-bold text-foreground">Xabarlar</h1>
        </div>
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(!!e.target.value); }}
              placeholder="Treyderlarni qidirish..." className="w-full rounded-xl bg-secondary/80 pl-9 pr-8 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/50 transition-all focus:ring-primary/50 focus:bg-secondary placeholder:text-muted-foreground" />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); setIsSearching(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
          {isSearching ? (
            <div className="px-2 py-1">
              <p className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Natijalar</p>
              {searchResults.length === 0 && searchQuery.trim() && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Hech narsa topilmadi</p>}
              {searchResults.map((profile) => (
                <button key={profile.user_id} onClick={() => openConversation(profile.user_id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-secondary/80 active:scale-[0.98]">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(profile.user_id)}`}>{getInitials(profile.username)}</div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{profile.username}</p>
                    <p className="text-xs text-primary/70 font-mono">Xabar yozish →</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-1">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass border-glow mb-4">
                    <MessageSquare className="h-9 w-9 text-primary/50" />
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground mb-1">Suhbatlar yo'q</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Suhbatni boshlash uchun yuqoridagi qidiruvdan treyderlarni toping</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button key={conv.id} onClick={() => { setActiveConversationId(conv.id); setShowSidebar(false); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 mb-0.5 transition-all active:scale-[0.98] ${activeConversationId === conv.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-secondary/60"}`}>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(conv.other_user?.user_id || "")}`}>{getInitials(conv.other_user?.username || "?")}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">{conv.other_user?.username || "Noma'lum"}</p>
                        {conv.last_message_at && <span className="font-mono text-[10px] text-muted-foreground/60 ml-2 shrink-0">{formatTime(conv.last_message_at)}</span>}
                      </div>
                      {conv.last_message && <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`${!showSidebar ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        {activeConversationId && activeConversation ? (
          <>
            {/* Header */}
            <header className="glass sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <button onClick={() => setShowSidebar(true)} className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground active:scale-95">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(activeConversation.other_user?.user_id || "")}`}>{getInitials(activeConversation.other_user?.username || "?")}</div>
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">{activeConversation.other_user?.username || "Noma'lum"}</h2>
                <p className="font-mono text-[10px] text-primary/60">Trader</p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center"><p className="text-2xl mb-2">👋</p><p className="text-sm text-muted-foreground">Salomlashing va suhbatni boshlang!</p></div>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const isAI = msg.isAI || msg.sender_id === "trade-ai";

                  if (isAI) {
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.15 }}
                        className="flex justify-start">
                        <div className="max-w-[85%] flex items-start gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]">
                            <Bot className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div className="flex flex-col items-start flex-1">
                            <span className="text-[10px] font-mono text-primary/80 mb-0.5 font-bold">Trade-AI</span>
                            <div className="w-full">
                              {renderMessageContent(msg)}
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.12 }}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed backdrop-blur-sm ${
                          isOwn
                            ? "rounded-br-sm bg-primary/90 text-primary-foreground shadow-[0_2px_16px_-4px_hsl(var(--primary)/0.35)]"
                            : "rounded-bl-sm bg-secondary/70 border border-border/40 text-foreground"
                        }`}>
                          {renderMessageContent(msg)}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                          <span className="font-mono text-[10px] text-muted-foreground/50">{formatTime(msg.created_at)}</span>
                          {isOwn && (
                            <span className={sendingIds.has(msg.id) ? "text-muted-foreground/40" : "text-primary/70"}>
                              {sendingIds.has(msg.id) ? <Check className="h-3 w-3" /> : <CheckCheck className="h-3 w-3" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {aiThinking && <AIThinkingBubble />}
              <div ref={bottomRef} />
            </div>

            {/* Recording overlay */}
            <AnimatePresence>
              {isRecording && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-16 left-0 right-0 flex flex-col items-center justify-center gap-3 p-6 glass border-t border-border/30 z-50">
                  {recordingType === "video" && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-destructive/60 animate-pulse">
                      <video ref={videoPreviewRef} className="w-full h-full object-cover" muted playsInline />
                    </div>
                  )}
                  {recordingType === "audio" && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                      <span className="font-mono text-sm text-destructive">Yozilmoqda...</span>
                    </div>
                  )}
                  <span className="font-mono text-lg font-bold text-foreground">{formatRecTime(recordingTime)}</span>
                  <div className="flex items-center gap-4">
                    <button onClick={cancelRecording} className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 text-destructive transition-colors hover:bg-destructive/30">
                      <X className="h-5 w-5" />
                    </button>
                    <button onClick={stopRecording} className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)] transition-transform active:scale-90">
                      <Send className="h-6 w-6" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emoji panel */}
            <AnimatePresence>
              {showEmoji && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="border-t border-border/30 bg-secondary/90 backdrop-blur-sm px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_LIST.map((em) => (
                      <button key={em} onClick={() => setNewMessage((prev) => prev + em)}
                        className="h-9 w-9 flex items-center justify-center text-lg rounded-lg hover:bg-primary/10 active:scale-90 transition-all">
                        {em}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI mode image preview */}
            <AnimatePresence>
              {aiMode && aiImageUrl && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="border-t border-border/30 bg-secondary/90 backdrop-blur-sm px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={aiImageUrl} alt="AI uchun rasm" className="h-16 w-16 rounded-lg object-cover border border-primary/30" />
                      <button onClick={() => setAiImageUrl(null)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Grafik rasm yuklandi. Xabar yozing yoki to'g'ridan-to'g'ri tahlil uchun yuboring.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI mode banner */}
            <AnimatePresence>
              {aiMode && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="border-t border-primary/30 bg-primary/5 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-xs font-mono text-primary font-bold">Trade-AI Tahlil Rejimi</span>
                  </div>
                  <button onClick={() => { setAiMode(false); setAiImageUrl(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Bekor qilish</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="glass border-t border-border/30 px-3 py-2.5 relative">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" />
              <input type="file" ref={aiFileInputRef} className="hidden" onChange={handleAIImageSelect} accept="image/*" />

              {/* Attach menu */}
              <AnimatePresence>
                {showAttachMenu && !aiMode && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full left-3 mb-2 flex gap-2 p-2 rounded-xl glass border border-border/40">
                    <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-primary/10 transition-colors">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Rasm</span>
                    </button>
                    <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-primary/10 transition-colors">
                      <FileText className="h-5 w-5 text-[hsl(210_80%_55%)]" />
                      <span className="text-[10px] text-muted-foreground">Fayl</span>
                    </button>
                    <button onClick={() => { startRecording("video"); setShowAttachMenu(false); }}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-primary/10 transition-colors">
                      <Video className="h-5 w-5 text-[hsl(330_60%_55%)]" />
                      <span className="text-[10px] text-muted-foreground">Video</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={aiMode ? handleAISend : sendMessage} className="flex items-center gap-1.5">
                {/* AI button */}
                <button type="button" onClick={() => {
                  setAiMode(!aiMode);
                  setShowAttachMenu(false);
                  setShowEmoji(false);
                  if (!aiMode) setAiImageUrl(null);
                }}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
                    aiMode
                      ? "bg-primary text-primary-foreground shadow-[0_0_16px_-3px_hsl(var(--primary)/0.5)]"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}>
                  <Sparkles className="h-4.5 w-4.5" />
                </button>

                {!aiMode ? (
                  <button type="button" onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10 active:scale-95">
                    <Paperclip className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <button type="button" onClick={() => aiFileInputRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10 active:scale-95">
                    <ImageIcon className="h-4.5 w-4.5" />
                  </button>
                )}

                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={aiMode ? "Grafikni tahlil qilish uchun rasm yuklang yoki savol yozing..." : "Xabar yozing..."}
                  className="flex-1 rounded-xl bg-secondary/80 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/50 transition-all focus:ring-primary/50 focus:bg-secondary placeholder:text-muted-foreground" />

                {!aiMode && (
                  <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10 active:scale-95">
                    <Smile className="h-4.5 w-4.5" />
                  </button>
                )}

                {aiMode ? (
                  <button type="submit" disabled={aiThinking || (!newMessage.trim() && !aiImageUrl)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] active:scale-95 disabled:opacity-50">
                    {aiThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  </button>
                ) : newMessage.trim() ? (
                  <button type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] active:scale-95">
                    <Send className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={() => startRecording("audio")}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] active:scale-95">
                    <Mic className="h-4 w-4" />
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass border-glow mb-5">
                <MessageSquare className="h-9 w-9 text-primary/50" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-1.5">Suhbatni tanlang</h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Chap tomondagi ro'yxatdan chat tanlang yoki treyderlarni qidiring</p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
