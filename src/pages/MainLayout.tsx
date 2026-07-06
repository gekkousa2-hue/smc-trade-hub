import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, LogIn } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import LiveFeedPage from "./LiveFeedPage";
import ChatPage from "./ChatPage";
import ProfilePage from "./ProfilePage";
import { GoLive } from "@/components/live/GoLive";
import { supabase } from "@/integrations/supabase/client";

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState<"live" | "chat" | "profile">("live");
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showGoLive, setShowGoLive] = useState(false);
  const [goLiveUser, setGoLiveUser] = useState<{ id: string; username: string } | null>(null);

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

  useEffect(() => {
    if (activeTab === "chat") {
      const t = setTimeout(refreshUnread, 1500);
      return () => clearTimeout(t);
    }
  }, [activeTab, refreshUnread]);

  const [profileFrom, setProfileFrom] = useState<"chat" | "live">("chat");

  const handleViewProfile = useCallback((userId: string) => {
    setProfileFrom(activeTab === "live" ? "live" : "chat");
    setProfileViewUserId(userId);
    setActiveTab("profile");
  }, [activeTab]);

  const handleBackFromProfile = useCallback(() => {
    setProfileViewUserId(null);
    setActiveTab(profileFrom);
  }, [profileFrom]);

  const handleGoLive = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Efirga chiqish uchun tizimga kiring");
      return;
    }
    const { data: p } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .single();
    setGoLiveUser({ id: user.id, username: p?.username || user.email?.split("@")[0] || "User" });
    setShowGoLive(true);
  }, []);

  const handleCloseGoLive = useCallback(() => {
    setShowGoLive(false);
    setGoLiveUser(null);
  }, []);

  return (
    <div className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (profileViewUserId || "")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "live" && <LiveFeedPage onViewProfile={handleViewProfile} />}
          {activeTab === "chat" && <ChatPage onViewProfile={handleViewProfile} />}
          {activeTab === "profile" && <ProfilePage viewUserId={profileViewUserId} onBack={profileViewUserId ? handleBackFromProfile : undefined} />}
        </motion.div>
      </AnimatePresence>
      <BottomNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); if (tab !== "profile") setProfileViewUserId(null); }} unreadCount={activeTab === "chat" ? 0 : unreadCount} />
    </div>
  );
}
