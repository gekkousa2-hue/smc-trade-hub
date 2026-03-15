import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { LogOut, User, Mail, Calendar } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

export default function ProfilePage() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("profiles")
          .select("username")
          .eq("user_id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setUsername(profile.username);
          });
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) =>
    name ? name.slice(0, 2).toUpperCase() : "??";

  return (
    <div className="flex flex-col items-center px-6 py-10 pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-5 w-full max-w-sm"
      >
        {/* Avatar */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary ring-2 ring-primary/30 shadow-[0_0_30px_-5px_hsl(45_93%_58%/0.3)]">
          {getInitials(username)}
        </div>

        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-foreground">
            {username || "Foydalanuvchi"}
          </h2>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            SMC Trader
          </p>
        </div>

        {/* Info cards */}
        <div className="w-full space-y-3 mt-4">
          <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
            <Mail className="h-4 w-4 text-primary" />
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                Email
              </p>
              <p className="text-sm text-foreground truncate">
                {user?.email || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                Ro'yxatdan o'tgan
              </p>
              <p className="text-sm text-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("uz", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 glass rounded-xl px-4 py-3">
            <User className="h-4 w-4 text-primary" />
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                ID
              </p>
              <p className="text-sm text-foreground font-mono truncate">
                {user?.id?.slice(0, 12)}...
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>
      </motion.div>
    </div>
  );
}
