import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/hooks/useChatState";

interface Props {
  messages: Message[];
  currentUserId?: string;
  sendingIds: Set<string>;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onContextMenu: (e: React.MouseEvent | React.PointerEvent, msg: Message) => void;
  onPointerDown: (e: React.PointerEvent, msg: Message) => void;
  onPointerUp: () => void;
  onRetry?: (id: string) => void;
  onScrollChange?: (nearBottom: boolean) => void;
}

export interface VirtualMessageListHandle {
  scrollToBottom: (smooth?: boolean) => void;
  isNearBottom: () => boolean;
}

export const VirtualMessageList = forwardRef<VirtualMessageListHandle, Props>(function VirtualMessageList(
  {
    messages, currentUserId, sendingIds, isLoadingMore, hasMore, onLoadMore,
    onContextMenu, onPointerDown, onPointerUp, onRetry, onScrollChange,
  }, ref
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);
  const lastCountRef = useRef(0);
  const lastFirstIdRef = useRef<string | null>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? index,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  const scrollToBottom = useCallback((smooth = true) => {
    const c = parentRef.current;
    if (!c || messages.length === 0) return;
    if (smooth) {
      c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
    } else {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      requestAnimationFrame(() => {
        if (parentRef.current) parentRef.current.scrollTop = parentRef.current.scrollHeight;
      });
    }
  }, [messages.length, virtualizer]);

  const isNearBottom = useCallback(() => {
    const c = parentRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 200;
  }, []);

  useImperativeHandle(ref, () => ({ scrollToBottom, isNearBottom }), [scrollToBottom, isNearBottom]);

  /* ─── Auto-scroll & maintain position ─── */
  useEffect(() => {
    const c = parentRef.current;
    if (!c) return;
    const prevCount = lastCountRef.current;
    const currCount = messages.length;
    const prevFirstId = lastFirstIdRef.current;
    const currFirstId = messages[0]?.id ?? null;
    lastCountRef.current = currCount;
    lastFirstIdRef.current = currFirstId;

    if (currCount === 0) return;

    // Initial render
    if (prevCount === 0) {
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }

    // Prepended (older messages loaded) — keep visual position
    if (currFirstId !== prevFirstId && currCount > prevCount) {
      // Anchor: scroll position is preserved automatically by virtualizer
      // because we estimate size; add diff to be safe after measurement
      isLoadingMoreRef.current = false;
      return;
    }

    // New message at bottom
    if (currCount > prevCount) {
      const last = messages[currCount - 1];
      const isOwn = last?.sender_id === currentUserId;
      if (isOwn || isNearBottom()) {
        requestAnimationFrame(() => scrollToBottom(true));
      }
    }
  }, [messages, currentUserId, scrollToBottom, isNearBottom]);

  /* ─── Scroll handler: top → load more, track near-bottom ─── */
  const handleScroll = useCallback(() => {
    const c = parentRef.current;
    if (!c) return;
    onScrollChange?.(isNearBottom());
    if (c.scrollTop < 120 && hasMore && !isLoadingMore && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      const prevHeight = c.scrollHeight;
      Promise.resolve(onLoadMore()).finally(() => {
        requestAnimationFrame(() => {
          if (parentRef.current) {
            parentRef.current.scrollTop = parentRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  }, [hasMore, isLoadingMore, onLoadMore, isNearBottom, onScrollChange]);

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 relative"
      style={{ contain: "strict" }}
    >
      {isLoadingMore && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex justify-center py-1">
          <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
        </div>
      )}
      <div style={{ height: totalSize, width: "100%", position: "relative" }}>
        {items.map((vi) => {
          const msg = messages[vi.index];
          if (!msg) return null;
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                paddingBottom: 10,
              }}
            >
              <MessageBubble
                msg={msg}
                isOwn={msg.sender_id === currentUserId}
                isSending={sendingIds.has(msg.id)}
                onContextMenu={onContextMenu}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onRetry={onRetry}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
