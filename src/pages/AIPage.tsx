import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  X,
  Trash2,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";

interface AIAnalysis {
  raw: string;
  signal?: string;
  structure?: string;
  recommendation?: string;
  entry?: string;
  target?: string;
  stopLoss?: string;
}

interface AIMessage {
  id: string;
  content: string;
  role: "user" | "ai";
  created_at: string;
  imageUrl?: string;
  aiAnalysis?: AIAnalysis | null;
  isThinking?: boolean;
}

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

export default function AIPage() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const uploadMedia = async (file: Blob, ext: string) => {
    if (!user) return null;
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file);
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "png";
    const url = await uploadMedia(file, ext);
    if (url) setImageUrl(url);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text && !imageUrl) return;
    if (!user) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      content: text || "📷 Grafik tahlili so'raldi",
      role: "user",
      created_at: new Date().toISOString(),
      imageUrl: imageUrl || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const currentImage = imageUrl;
    setImageUrl(null);
    setIsThinking(true);

    try {
      const resp = await fetch(TRADE_AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageUrl: currentImage, message: text }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Xatolik" }));
        throw new Error(errData.error || "AI xizmati xatosi");
      }

      const data = await resp.json();
      const analysis = parseAIAnalysis(data.content);

      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        content: data.content,
        role: "ai",
        created_at: new Date().toISOString(),
        aiAnalysis: analysis,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: AIMessage = {
        id: `ai-err-${Date.now()}`,
        content: `⚠️ ${err instanceof Error ? err.message : "AI xizmati bilan bog'lanishda xatolik"}`,
        role: "ai",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setImageUrl(null);
    setInput("");
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_16px_-3px_hsl(var(--primary)/0.4)]">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-foreground">Trade-AI</h2>
            <p className="font-mono text-[10px] text-primary/60">SMC Tahlil Agenti</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center px-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass border-glow mb-5">
                <Sparkles className="h-9 w-9 text-primary/60" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">Trade-AI Tahlil</h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                Grafik rasmini yuklang yoki savol yozing — AI professional SMC tahlilini beradi
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {[
                  "XAUUSD hozir qaysi trend?",
                  "BOS va CHoCH farqi nima?",
                  "Order Block qanday topiladi?",
                  "FVG nima va qanday ishlatiladi?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="rounded-xl glass border border-border/40 px-3 py-2.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all text-left leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            if (!isUser) {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="max-w-[85%] flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col items-start flex-1">
                      <span className="text-[10px] font-mono text-primary/80 mb-0.5 font-bold">Trade-AI</span>
                      <div className="w-full">
                        {msg.aiAnalysis ? <AIAnalysisCard analysis={msg.aiAnalysis} /> : <div className="rounded-2xl rounded-bl-sm bg-secondary/70 border border-border/40 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">{msg.content}</div>}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                <div className="max-w-[78%] flex flex-col items-end">
                  <div className="rounded-2xl rounded-br-sm bg-primary/90 text-primary-foreground px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_2px_16px_-4px_hsl(var(--primary)/0.35)]">
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="grafik" className="rounded-xl max-w-[220px] max-h-[180px] object-cover mb-2" />
                    )}
                    {msg.content}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">{formatTime(msg.created_at)}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isThinking && (
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
        )}

        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imageUrl && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="border-t border-border/30 bg-secondary/90 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={imageUrl} alt="Grafik" className="h-16 w-16 rounded-lg object-cover border border-primary/30" />
                <button onClick={() => setImageUrl(null)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Grafik yuklandi. Savol yozing yoki to'g'ridan-to'g'ri tahlil uchun yuboring.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="glass border-t border-border/30 px-3 py-2.5">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageSelect} accept="image/*" />
        <form onSubmit={sendMessage} className="flex items-center gap-1.5">
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10 active:scale-95">
            <ImageIcon className="h-4.5 w-4.5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Grafik yuklang yoki savol yozing..."
            className="flex-1 rounded-xl bg-secondary/80 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/50 transition-all focus:ring-primary/50 focus:bg-secondary placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={isThinking || (!input.trim() && !imageUrl)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] active:scale-95 disabled:opacity-50"
          >
            {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
