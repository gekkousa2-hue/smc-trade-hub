import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import Index from "./Index";
import ChatPage from "./ChatPage";
import ProfilePage from "./ProfilePage";

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState<"chart" | "chat" | "profile">("chart");

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "chart" && <Index />}
          {activeTab === "chat" && <ChatPage />}
          {activeTab === "profile" && <ProfilePage />}
        </motion.div>
      </AnimatePresence>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
