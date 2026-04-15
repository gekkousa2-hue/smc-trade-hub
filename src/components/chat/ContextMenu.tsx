import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Trash2, Pin, Reply } from "lucide-react";
import type { Message } from "@/hooks/useChatState";

interface Props {
  contextMenuMsgId: string | null;
  contextMenuPos: { x: number; y: number };
  messages: Message[];
  onStartEditing: (msg: Message) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onReply: (msg: Message) => void;
}

export const ContextMenu = memo(function ContextMenu({
  contextMenuMsgId, contextMenuPos, messages, onStartEditing, onDelete, onTogglePin, onReply,
}: Props) {
  return (
    <AnimatePresence>
      {contextMenuMsgId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[100] glass border border-border/50 rounded-xl shadow-xl overflow-hidden"
          style={{
            left: Math.min(contextMenuPos.x, window.innerWidth - 160),
            top: Math.max(contextMenuPos.y - 120, 8),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const msg = messages.find(m => m.id === contextMenuMsgId);
            if (!msg) return null;
            const canEdit = !msg.media_type;
            return (
              <>
                <button onClick={() => onReply(msg)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 transition-colors">
                  <Reply className="h-4 w-4 text-primary" /> Javob berish
                </button>
                {canEdit && (
                  <button onClick={() => onStartEditing(msg)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 transition-colors">
                    <Pencil className="h-4 w-4 text-primary" /> Tahrirlash
                  </button>
                )}
                <button onClick={() => onTogglePin(msg.id)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 transition-colors">
                  <Pin className="h-4 w-4 text-primary" /> {msg.is_pinned ? "Pin olib tashlash" : "Pin qilish"}
                </button>
                <button onClick={() => onDelete(contextMenuMsgId!)} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" /> O'chirish
                </button>
              </>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
