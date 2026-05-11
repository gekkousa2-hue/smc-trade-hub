import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { LogIn, UserPlus, MessageCircle } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || `User_${Date.now().toString(36)}` },
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setError("Emailingizni tasdiqlang yoki qayta kiring.");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(
        isLogin
          ? "Email yoki parol noto'g'ri."
          : "Ro'yxatdan o'tishda xatolik. Qayta urinib ko'ring."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-[0_0_30px_-4px_hsl(45_93%_58%/0.4)]">
            <MessageCircle className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gradient-gold">Trade Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">Treyderlar uchun chat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl glass border-glow p-6">
          {!isLogin && (
            <div>
              <label className="mb-1.5 block font-mono text-[11px] font-medium tracking-wider text-muted-foreground">
                USERNAME
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-border transition-all focus:ring-primary"
                placeholder="Ismingiz"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] font-medium tracking-wider text-muted-foreground">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-border transition-all focus:ring-primary"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[11px] font-medium tracking-wider text-muted-foreground">
              PAROL
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-border transition-all focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" /> Kirish
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Ro'yxatdan o'tish
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? "Akkountingiz yo'qmi? " : "Allaqachon ro'yxatdan o'tganmisiz? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="font-semibold text-primary hover:underline"
            >
              {isLogin ? "Ro'yxatdan o'ting" : "Kirish"}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
