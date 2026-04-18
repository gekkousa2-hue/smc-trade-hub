import { useRef, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Check, X, Paperclip, Mic, Smile, Image as ImageIcon, FileText, Video, Pencil, Reply,
} from "lucide-react";
import { EMOJI_LIST, formatRecTime } from "./ChatHelpers";
import type { Message } from "@/hooks/useChatState";

interface Props {
  newMessage: string;
  editingMsgId: string | null;
  editContent: string;
  replyTo: Message | null;
  showEmoji: boolean;
  showAttachMenu: boolean;
  isRecording: boolean;
  recordingType: "audio" | "video" | null;
  recordingTime: number;
  onNewMessageChange: (v: string) => void;
  onEditContentChange: (v: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onCancelReply: () => void;
  onToggleEmoji: () => void;
  onToggleAttach: () => void;
  onStartRecording: (type: "audio" | "video") => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTyping: () => void;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
}

export const MessageInput = memo(function MessageInput({
  newMessage, editingMsgId, editContent, replyTo, showEmoji, showAttachMenu,
  isRecording, recordingType, recordingTime,
  onNewMessageChange, onEditContentChange, onSendMessage, onSaveEdit, onCancelEdit,
  onCancelReply, onToggleEmoji, onToggleAttach, onStartRecording, onStopRecording,
  onCancelRecording, onFileSelect, onTyping, videoPreviewRef,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Recording Overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-0 right-0 flex flex-col items-center justify-center gap-3 p-6 glass border-t border-border/30 z-50"
          >
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
              <button onClick={onCancelRecording} className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 text-destructive transition-colors hover:bg-destructive/30">
                <X className="h-5 w-5" />
              </button>
              <button onClick={onStopRecording} className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)] transition-transform active:scale-90">
                <Send className="h-6 w-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Panel */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="border-t border-border/30 bg-secondary/90 backdrop-blur-sm px-4 py-3"
          >
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_LIST.map((em) => (
                <button
                  key={em}
                  onClick={() => onNewMessageChange(newMessage + em)}
                  className="h-9 w-9 flex items-center justify-center text-lg rounded-lg hover:bg-primary/10 active:scale-90 transition-all"
                >
                  {em}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply bar */}
      {replyTo && (
        <div className="border-t border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2">
          <Reply className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-primary font-medium truncate flex-1">{replyTo.content}</span>
          <button onClick={onCancelReply} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit Bar */}
      {editingMsgId && (
        <div className="border-t border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-primary font-medium">Tahrirlash</span>
          <button onClick={onCancelEdit} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="glass border-t border-border/30 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] relative">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelect} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" />

        {/* Attach Menu */}
        <AnimatePresence>
          {showAttachMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-3 mb-2 flex gap-2 p-2 rounded-xl glass border border-border/40"
            >
              <button onClick={() => { fileInputRef.current?.click(); onToggleAttach(); }} className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-primary/10 transition-colors">
                <ImageIcon className="h-5 w-5 text-primary" />
                <span className="text-[10px] text-muted-foreground">Rasm</span>
              </button>
              <button onClick={() => { fileInputRef.current?.click(); onToggleAttach(); }} className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-primary/10 transition-colors">
                <FileText className="h-5 w-5 text-[hsl(210_80%_55%)]" />
                <span className="text-[10px] text-muted-foreground">Fayl</span>
              </button>
              <button onClick={() => { onStartRecording("video"); onToggleAttach(); }} className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-primary/10 transition-colors">
                <Video className="h-5 w-5 text-[hsl(330_60%_55%)]" />
                <span className="text-[10px] text-muted-foreground">Video</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={editingMsgId ? (e) => { e.preventDefault(); onSaveEdit(); } : onSendMessage} className="flex items-center gap-1.5">
          {!editingMsgId && (
            <button type="button" onClick={onToggleAttach} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10 active:scale-95">
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
          )}

          <input
            type="text"
            value={editingMsgId ? editContent : newMessage}
            onChange={(e) => {
              if (editingMsgId) onEditContentChange(e.target.value);
              else { onNewMessageChange(e.target.value); onTyping(); }
            }}
            placeholder={editingMsgId ? "Xabarni tahrirlang..." : "Xabar yozing..."}
            className="flex-1 rounded-xl bg-secondary/80 px-4 py-2.5 text-sm text-foreground outline-none ring-1 ring-border/50 transition-all focus:ring-primary/50 focus:bg-secondary placeholder:text-muted-foreground"
          />

          {!editingMsgId && (
            <button type="button" onClick={onToggleEmoji} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10 active:scale-95">
              <Smile className="h-[18px] w-[18px]" />
            </button>
          )}

          {editingMsgId ? (
            <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] active:scale-95">
              <Check className="h-4 w-4" />
            </button>
          ) : newMessage.trim() ? (
            <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] active:scale-95">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={() => onStartRecording("audio")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)] active:scale-95">
              <Mic className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
    </>
  );
});
