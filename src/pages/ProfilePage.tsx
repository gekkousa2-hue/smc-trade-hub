import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Settings, ChevronRight, Shield, X, Check, Camera, Loader2, ArrowLeft, UserPlus, UserCheck, Radio,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { useTranslation } from "react-i18next";
import SettingsPage from "./SettingsPage";
import LanguagePage from "./LanguagePage";
import BlockedUsersPage from "./BlockedUsersPage";
import ThemePage from "./ThemePage";
import NotificationsPage from "./NotificationsPage";
import PrivacyPage from "./PrivacyPage";
import { getFollowStats, isFollowing, toggleFollow } from "@/lib/social";


type SubPage = null | "settings" | "language" | "blocked" | "edit-profile" | "theme" | "notifications" | "privacy";

interface ProfilePageProps {
  viewUserId?: string | null;
  onBack?: () => void;
  onGoLive?: () => void;
}

export default function ProfilePage({ viewUserId, onBack, onGoLive }: ProfilePageProps) {
  const { t } = useTranslation();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [subPage, setSubPage] = useState<SubPage>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewProfile, setViewProfile] = useState<{ username: string; avatar_url: string | null; created_at?: string; is_online?: boolean; last_seen?: string } | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isViewingOther = !!viewUserId;


  useEffect(() => {
    if (isViewingOther) {
      supabase
        .from("profiles")
        .select("username, avatar_url, created_at, is_online, last_seen")
        .eq("user_id", viewUserId)
        .single()
        .then(({ data }) => {
          if (data) setViewProfile(data as any);
        });
      return;
    }
    setViewProfile(null);
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("user_id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setUsername(profile.username);
              setEditName(profile.username);
              setAvatarUrl(profile.avatar_url);
            }
          });
      }
    });
  }, [isViewingOther, viewUserId]);

  // Load follow stats + own follow relation
  useEffect(() => {
    const targetId = viewUserId || null;
    (async () => {
      const { data: { user: me } } = await supabase.auth.getUser();
      const uid = targetId || me?.id;
      if (!uid) return;
      const s = await getFollowStats(uid);
      setStats(s);
      if (targetId && me && me.id !== targetId) {
        setFollowing(await isFollowing(me.id, targetId));
      }
    })();
  }, [viewUserId]);

  const handleToggleFollow = async () => {
    if (!viewUserId) return;
    setFollowBusy(true);
    try {
      const res = await toggleFollow(viewUserId);
      setFollowing(res === "followed");
      setStats((s) => ({ ...s, followers: Math.max(0, s.followers + (res === "followed" ? 1 : -1)) }));
    } catch (e) {
      const m = (e as Error).message;
      toast.error(m === "AUTH_REQUIRED" ? "Tizimga kiring" : "Xatolik");
    } finally {
      setFollowBusy(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };


  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      toast.error("Ism 2 dan 50 belgigacha bo'lishi kerak");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username: trimmed }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(t("profile.error")); }
    else { setUsername(trimmed); setSubPage(null); toast.success(t("profile.name_updated")); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t("profile.image_too_large")); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(publicUrl);
      toast.success(t("profile.avatar_updated"));
    } catch (err) {
      console.error(err);
      toast.error(t("profile.upload_error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  // ─── Sub-pages ───
  if (subPage === "settings") {
    return (
      <SettingsPage
        onBack={() => setSubPage(null)}
        onNavigate={(p) => {
          if (p === "edit-profile") { setEditName(username); setSubPage("edit-profile"); }
          else if (p === "language") setSubPage("language");
          else if (p === "blocked") setSubPage("blocked");
          else if (p === "theme") setSubPage("theme");
          else if (p === "notifications") setSubPage("notifications");
          else if (p === "privacy") setSubPage("privacy");
        }}
      />
    );
  }
  if (subPage === "language") return <LanguagePage onBack={() => setSubPage("settings")} />;
  if (subPage === "blocked") return <BlockedUsersPage onBack={() => setSubPage("settings")} />;
  if (subPage === "theme") return <ThemePage onBack={() => setSubPage("settings")} />;
  if (subPage === "notifications") return <NotificationsPage onBack={() => setSubPage("settings")} />;
  if (subPage === "privacy") return <PrivacyPage onBack={() => setSubPage("settings")} />;

  const displayName = isViewingOther ? viewProfile?.username : username;
  const displayAvatar = isViewingOther ? viewProfile?.avatar_url : avatarUrl;
  const displayUserId = isViewingOther ? viewUserId || "" : user?.id || "";

  return (
    <div className="flex flex-col items-center px-4 py-8 pb-28 min-h-full">
      {isViewingOther && onBack && (
        <div className="w-full max-w-md mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> {t("settings.back")}
          </button>
        </div>
      )}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center gap-5 w-full max-w-md">
        {/* Avatar */}
        <motion.div variants={item} className="relative">
          <div className="absolute inset-0 -m-3 rounded-full bg-primary/10 blur-2xl animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="relative">
            <UserAvatar userId={displayUserId} username={displayName || "?"} avatarUrl={displayAvatar} size="2xl" ring />
            {!isViewingOther && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_20px_-2px_hsl(45_93%_58%/0.7)] ring-4 ring-background transition-all hover:scale-110 active:scale-95 disabled:opacity-60"
                  aria-label={t("profile.change_avatar")}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Name & Badge */}
        <motion.div variants={item} className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">{displayName || t("profile.user")}</h2>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 px-3.5 py-1 shadow-[0_2px_12px_-4px_hsl(45_93%_58%/0.4)]">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary font-mono tracking-wider">{t("profile.elite")}</span>
          </div>
        </motion.div>

        {/* Follow stats */}
        <motion.div variants={item} className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{stats.followers}</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Obunachi</div>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{stats.following}</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Obuna</div>
          </div>
        </motion.div>

        {/* Follow button (viewing other) */}
        {isViewingOther && (
          <motion.button
            variants={item}
            onClick={handleToggleFollow}
            disabled={followBusy}
            className={`w-full h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
              following
                ? "bg-muted text-foreground border border-border hover:bg-accent"
                : "bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]"
            }`}
          >
            {followBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <><UserCheck className="h-4 w-4" /> Obuna bo'lingan</> : <><UserPlus className="h-4 w-4" /> Obuna bo'lish</>}
          </motion.button>
        )}


        {/* Info Row */}
        <motion.div variants={item} className="w-full grid grid-cols-2 gap-3">
          {isViewingOther ? (
            <>
              <div className="premium-card rounded-2xl p-3.5 text-center">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.15em]">Status</p>
                <p className="text-xs text-foreground mt-1">
                  {viewProfile?.is_online ? (
                    <span className="text-[hsl(142_70%_48%)]">● Online</span>
                  ) : viewProfile?.last_seen ? (
                    <span className="text-muted-foreground/70">{new Date(viewProfile.last_seen).toLocaleDateString("uz", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div className="premium-card rounded-2xl p-3.5 text-center">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.15em]">ID</p>
                <p className="text-xs text-foreground truncate mt-1 font-mono">{viewUserId?.slice(0, 8)}...</p>
              </div>
            </>
          ) : (
            <>
              <div className="premium-card rounded-2xl p-3.5 text-center">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.15em]">{t("profile.email")}</p>
                <p className="text-xs text-foreground truncate mt-1 font-mono">{user?.email || "—"}</p>
              </div>
              <div className="premium-card rounded-2xl p-3.5 text-center">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.15em]">{t("profile.member_since")}</p>
                <p className="text-xs text-foreground mt-1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </p>
              </div>
            </>
          )}
        </motion.div>

        {/* Menu Items */}
        {!isViewingOther && (
          <motion.div variants={item} className="w-full space-y-2.5 mt-2">
            <button
              onClick={() => setSubPage("settings")}
              className="flex w-full items-center gap-3 premium-card rounded-2xl px-4 py-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)] active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Settings className="h-[18px] w-[18px] text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground flex-1 text-left">{t("profile.settings")}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/30 px-4 py-4 transition-all duration-200 hover:bg-destructive/20 hover:shadow-[0_0_20px_-8px_hsl(var(--destructive)/0.5)] active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 ring-1 ring-destructive/30">
                <LogOut className="h-[18px] w-[18px] text-destructive" />
              </div>
              <span className="text-sm font-semibold text-destructive flex-1 text-left">{t("profile.logout")}</span>
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Edit Name Dialog */}
      {!isViewingOther && (
        <Dialog open={subPage === "edit-profile"} onOpenChange={(o) => !o && setSubPage("settings")}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground font-display">{t("profile.edit_name")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{t("profile.username")}</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1.5 bg-muted border-border" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSubPage("settings")} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent">
                  <X className="h-4 w-4" /> {t("profile.cancel")}
                </button>
                <button onClick={handleSaveName} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  <Check className="h-4 w-4" /> {saving ? t("profile.saving") : t("profile.save")}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
