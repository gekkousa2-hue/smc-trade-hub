import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import Index from "./Index";
import ChatPage from "./ChatPage";
import ProfilePage from "./ProfilePage";
import AIPage from "./AIPage";
import { supabase } from "@/integrations/supabase/client";

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState<"chart" | "chat" | "ai" | "profile">("chart");
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .neq("status", "read" as any);
    setUnreadCount(count || 0);
  }, []);

  useEffect(() => {
    refreshUnread();
    let cleanup: (() => void) | undefined;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const channel = supabase
        .channel(`unread-${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refreshUnread())
        .subscribe();
      cleanup = () => { supabase.removeChannel(channel); };
    });
    return () => { cleanup?.(); };
  }, [refreshUnread]);

  // Refresh when switching to chat (resets badge after viewing)
  useEffect(() => {
    if (activeTab === "chat") {
      const t = setTimeout(refreshUnread, 1500);
      return () => clearTimeout(t);
    }
  }, [activeTab, refreshUnread]);

  return (
    <div className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "chart" && <Index />}
          {activeTab === "ai" && <AIPage />}
          {activeTab === "chat" && <ChatPage />}
          {activeTab === "profile" && <ProfilePage />}
        </motion.div>
      </AnimatePresence>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={activeTab === "chat" ? 0 : unreadCount} />
    </div>
  );
}
