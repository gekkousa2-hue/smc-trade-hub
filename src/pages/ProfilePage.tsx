import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  LogOut,
  Settings,
  History,
  ChevronRight,
  TrendingUp,
  Shield,
  Edit2,
  X,
  Check,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ProfilePage() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [username, setUsername] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

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
            if (profile) {
              setUsername(profile.username);
              setEditName(profile.username);
            }
          });
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: editName.trim() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Xatolik yuz berdi");
    } else {
      setUsername(editName.trim());
      setShowSettings(false);
      toast.success("Ism yangilandi!");
    }
  };

  const getInitials = (name: string) =>
    name ? name.slice(0, 2).toUpperCase() : "??";

  const mockBalance = 10540.0;
  const mockChange = 2.4;

  const mockHistory = [
    { pair: "XAU/USD", type: "BUY", pnl: "+$124.50", time: "Bugun 14:32" },
    { pair: "XAU/USD", type: "SELL", pnl: "-$45.20", time: "Bugun 11:05" },
    { pair: "XAU/USD", type: "BUY", pnl: "+$89.00", time: "Kecha 21:18" },
    { pair: "XAU/USD", type: "SELL", pnl: "+$210.30", time: "Kecha 16:44" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex flex-col items-center px-4 py-6 pb-24 min-h-full">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center gap-4 w-full max-w-md"
      >
        {/* Avatar */}
        <motion.div variants={item} className="relative">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/40 p-[3px] shadow-[0_0_40px_-5px_hsl(45_93%_58%/0.45)]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-3xl font-bold text-primary font-display">
              {getInitials(username)}
            </div>
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[pulse_3s_ease-in-out_infinite]" />
        </motion.div>

        {/* Name & Badge */}
        <motion.div variants={item} className="text-center space-y-1.5">
          <h2 className="font-display text-xl font-bold text-foreground">
            {username || "Foydalanuvchi"}
          </h2>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary font-mono tracking-wide">
              Elite Trader
            </span>
          </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          variants={item}
          className="w-full glass rounded-2xl border-glow p-5 mt-2"
        >
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
            Umumiy Balans
          </p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-gradient-gold font-display tracking-tight">
              ${mockBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1 rounded-lg bg-success/10 border border-success/20 px-2 py-1">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-bold text-success font-mono">
                +{mockChange}%
              </span>
            </div>
          </div>
          {/* Mini bar chart decoration */}
          <div className="flex items-end gap-1 mt-4 h-8">
            {[40, 55, 35, 70, 60, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/20"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Info Row */}
        <motion.div variants={item} className="w-full grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3 text-center">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Email
            </p>
            <p className="text-xs text-foreground truncate mt-0.5 font-mono">
              {user?.email || "—"}
            </p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              A'zo bo'lgan
            </p>
            <p className="text-xs text-foreground mt-0.5">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("uz", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div variants={item} className="w-full space-y-2 mt-2">
          <button
            onClick={() => {
              setEditName(username);
              setShowSettings(true);
            }}
            className="flex w-full items-center gap-3 glass glass-hover rounded-xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1 text-left">
              Sozlamalar
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => setShowHistory(true)}
            className="flex w-full items-center gap-3 glass glass-hover rounded-xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <History className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1 text-left">
              Savdo tarixi
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3.5 transition-all duration-200 hover:bg-destructive/20 active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15">
              <LogOut className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-sm font-medium text-destructive flex-1 text-left">
              Chiqish
            </span>
          </button>
        </motion.div>
      </motion.div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display">
              Profilni tahrirlash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Foydalanuvchi nomi
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1.5 bg-muted border-border"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="h-4 w-4" />
                Bekor qilish
              </button>
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trade History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display">
              Savdo tarixi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-72 overflow-y-auto">
            {mockHistory.map((trade, i) => (
              <div
                key={i}
                className="flex items-center justify-between glass rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {trade.pair}{" "}
                    <span
                      className={
                        trade.type === "BUY"
                          ? "text-success text-xs"
                          : "text-destructive text-xs"
                      }
                    >
                      {trade.type}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {trade.time}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold font-mono ${
                    trade.pnl.startsWith("+")
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {trade.pnl}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
