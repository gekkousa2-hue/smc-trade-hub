import { memo, useRef } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, FileText, Pin, Reply } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import { VideoMessage } from "./VideoMessage";
import { formatTime } from "./ChatHelpers";
import type { Message } from "@/hooks/useChatState";

interface Props {
  msg: Message;
  isOwn: boolean;
  isSending: boolean;
  onContextMenu: (e: React.MouseEvent | React.PointerEvent, msg: Message) => void;
  onPointerDown: (e: React.PointerEvent, msg: Message) => void;
  onPointerUp: () => void;
}

function renderContent(msg: Message) {
  if (msg.media_type === "audio" && msg.media_url) return <AudioPlayer src={msg.media_url} />;
  if (msg.media_type === "video" && msg.media_url) return <VideoMessage src={msg.media_url} />;
  if (msg.media_type === "image" && msg.media_url) return (
    <div className="space-y-1.5">
      <img src={msg.media_url} alt="media" className="rounded-xl max-w-[240px] max-h-[240px] object-cover" loading="lazy" />
      {msg.content && msg.content !== "📎" && <p className="text-sm">{msg.content}</p>}
    </div>
  );
  if (msg.media_type === "file" && msg.media_url) return (
    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline decoration-primary/40">
      <FileText className="h-4 w-4" /> {msg.content || "Fayl"}
    </a>
  );
  return <span>{msg.content}</span>;
}

function StatusIcon({ msg, isSending }: { msg: Message; isSending: boolean }) {
  if (isSending) return <Check className="h-3 w-3 text-muted-foreground/40" />;
  if (msg.status === "read") return <CheckCheck className="h-3 w-3 text-[hsl(210_80%_55%)]" />;
  if (msg.status === "delivered") return <CheckCheck className="h-3 w-3 text-primary/70" />;
  return <Check className="h-3 w-3 text-primary/70" />;
}

export const MessageBubble = memo(function MessageBubble({ msg, isOwn, isSending, onContextMenu, onPointerDown, onPointerUp }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.12 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[78%] flex flex-col ${isOwn ? "items-end" : "items-start"} select-none`}
        onPointerDown={(e) => onPointerDown(e, msg)}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onContextMenu={(e) => { if (isOwn && !msg.id.startsWith("temp-")) { e.preventDefault(); onContextMenu(e, msg); } }}
      >
        {/* Reply preview */}
        {msg.reply_to && (
          <div className={`flex items-center gap-1.5 text-[11px] mb-1 px-2 py-1 rounded-lg ${isOwn ? "bg-primary/10" : "bg-secondary/50"} border-l-2 border-primary/50`}>
            <Reply className="h-3 w-3 text-primary/60" />
            <span className="text-muted-foreground truncate max-w-[180px]">{msg.reply_to.content}</span>
          </div>
        )}

        {/* Pin indicator */}
        {msg.is_pinned && (
          <div className="flex items-center gap-1 text-[10px] text-primary/60 mb-0.5">
            <Pin className="h-2.5 w-2.5" />
            <span>Muhim xabar</span>
          </div>
        )}

        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed backdrop-blur-sm ${
          isOwn
            ? "rounded-br-sm bg-primary/90 text-primary-foreground shadow-[0_2px_16px_-4px_hsl(var(--primary)/0.35)]"
            : "rounded-bl-sm bg-secondary/70 border border-border/40 text-foreground"
        }`}>
          {renderContent(msg)}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="font-mono text-[10px] text-muted-foreground/50">{formatTime(msg.created_at)}</span>
          {msg.edited_at && <span className="font-mono text-[9px] text-muted-foreground/40">tahrirlangan</span>}
          {isOwn && <StatusIcon msg={msg} isSending={isSending} />}
        </div>
      </div>
    </motion.div>
  );
});
