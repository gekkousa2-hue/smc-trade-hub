import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ArrowDown, Loader2 } from "lucide-react";
import { useChatState, type Message } from "@/hooks/useChatState";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { ContextMenu } from "@/components/chat/ContextMenu";
import { MessageSkeleton } from "@/components/chat/SkeletonLoaders";
import { supabase } from "@/integrations/supabase/client";

export default function ChatPage() {
  const state = useChatState();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ─── Infinite scroll ─── */
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 80 && state.hasMore && !state.isLoadingMore) {
      const prevHeight = container.scrollHeight;
      state.loadMoreMessages();
      // Restore scroll position after loading
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - prevHeight;
        }
      });
    }
  }, [state.hasMore, state.isLoadingMore, state.loadMoreMessages]);

  /* ─── Show scroll-to-bottom button ─── */
  const isNearBottom = useCallback(() => {
    const c = scrollContainerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 200;
  }, []);

  /* ─── Long press handler ─── */
  const handlePointerDown = useCallback((e: React.PointerEvent, msg: Message) => {
    if (msg.sender_id !== state.user?.id) return;
    if (msg.id.startsWith("temp-")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    longPressTimerRef.current = setTimeout(() => {
      state.setContextMenuMsgId(msg.id);
      state.setContextMenuPos({ x: rect.left + rect.width / 2, y: rect.top });
    }, 500);
  }, [state.user]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    state.setContextMenuMsgId(msg.id);
    state.setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  /* ─── Recording ─── */
  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startRecording = async (type: "audio" | "video") => {
    try {
      const constraints: MediaStreamConstraints = type === "audio"
        ? { audio: true }
        : { audio: true, video: { facingMode: "user", width: 320, height: 320 } };
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
        const url = await state.uploadMedia(blob, "webm");
        if (url) await state.sendMessage(undefined, url, type);
        stopStreamTracks();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      state.setIsRecording(true);
      state.setRecordingType(type);
      state.setRecordingTime(0);
      recordTimerRef.current = setInterval(() => state.setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    state.setIsRecording(false);
    state.setRecordingType(null);
    state.setRecordingTime(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    stopStreamTracks();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    state.setIsRecording(false);
    state.setRecordingType(null);
    state.setRecordingTime(0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state.user) return;
    state.setShowAttachMenu(false);
    const ext = file.name.split(".").pop() || "file";
    const isImage = file.type.startsWith("image/");
    const url = await state.uploadMedia(file, ext);
    if (url) await state.sendMessage(undefined, url, isImage ? "image" : "file");
    e.target.value = "";
  };

  const activeConversation = state.conversations.find(c => c.id === state.activeConversationId);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* ─── Sidebar ─── */}
      <div className={`${state.showSidebar ? "flex" : "hidden md:flex"} w-full md:w-80 flex-col border-r border-border/30`}>
        <ChatSidebar
          conversations={state.conversations}
          activeConversationId={state.activeConversationId}
          searchQuery={state.searchQuery}
          searchResults={state.searchResults}
          isSearching={state.isSearching}
          loadingConversations={state.loadingConversations}
          onSearchChange={(q) => { state.setSearchQuery(q); state.setIsSearching(!!q); }}
          onOpenConversation={state.openConversation}
          onSelectConversation={(id) => { state.setActiveConversationId(id); state.setShowSidebar(false); }}
        />
      </div>

      {/* ─── Chat Area ─── */}
      <div className={`${!state.showSidebar ? "flex" : "hidden md:flex"} flex-1 flex-col relative`}>
        {state.activeConversationId && activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              otherTyping={state.otherTyping}
              onBack={() => state.setShowSidebar(true)}
            />

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 relative scroll-smooth"
            >
              {/* Loading more indicator */}
              {state.isLoadingMore && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
                </div>
              )}

              {state.loadingMessages ? (
                <MessageSkeleton />
              ) : state.messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl mb-2">👋</p>
                    <p className="text-sm text-muted-foreground">Salomlashing va suhbatni boshlang!</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {state.messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.sender_id === state.user?.id}
                      isSending={state.sendingIds.has(msg.id)}
                      onContextMenu={handleContextMenu}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                    />
                  ))}
                </AnimatePresence>
              )}

              {/* Typing indicator */}
              {state.otherTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-bl-sm bg-secondary/70 border border-border/40 px-4 py-2.5">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />

              {/* Context Menu */}
              <ContextMenu
                contextMenuMsgId={state.contextMenuMsgId}
                contextMenuPos={state.contextMenuPos}
                messages={state.messages}
                onStartEditing={state.startEditing}
                onDelete={state.deleteMessage}
                onTogglePin={state.togglePin}
                onReply={state.replyToMessage}
              />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {scrollContainerRef.current && !isNearBottom() && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-20 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full glass border border-border/40 shadow-lg transition-colors hover:bg-primary/10"
                >
                  <ArrowDown className="h-4 w-4 text-primary" />
                </motion.button>
              )}
            </AnimatePresence>

            <MessageInput
              newMessage={state.newMessage}
              editingMsgId={state.editingMsgId}
              editContent={state.editContent}
              replyTo={state.replyTo}
              showEmoji={state.showEmoji}
              showAttachMenu={state.showAttachMenu}
              isRecording={state.isRecording}
              recordingType={state.recordingType}
              recordingTime={state.recordingTime}
              onNewMessageChange={state.setNewMessage}
              onEditContentChange={state.setEditContent}
              onSendMessage={state.sendMessage}
              onSaveEdit={state.saveEdit}
              onCancelEdit={state.cancelEdit}
              onCancelReply={() => state.setReplyTo(null)}
              onToggleEmoji={() => { state.setShowEmoji(!state.showEmoji); state.setShowAttachMenu(false); }}
              onToggleAttach={() => { state.setShowAttachMenu(!state.showAttachMenu); state.setShowEmoji(false); }}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onCancelRecording={cancelRecording}
              onFileSelect={handleFileSelect}
              onTyping={state.handleTyping}
              videoPreviewRef={videoPreviewRef}
            />
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
