import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile?: { username: string; avatar_url: string | null };
}

export function useBlockedUsers() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("blocked_users")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });
    if (data && data.length) {
      const ids = data.map(b => b.blocked_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", ids);
      const map = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setBlocked(data.map(b => ({
        ...b,
        profile: map.get(b.blocked_id) ? { username: map.get(b.blocked_id)!.username, avatar_url: map.get(b.blocked_id)!.avatar_url } : undefined,
      })));
    } else {
      setBlocked([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const block = useCallback(async (blockedId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === blockedId) return { error: "invalid" };
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: blockedId });
    if (!error) await load();
    return { error };
  }, [load]);

  const unblock = useCallback(async (blockedId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
    await load();
  }, [load]);

  const isBlocked = useCallback((userId: string) => blocked.some(b => b.blocked_id === userId), [blocked]);

  return { blocked, loading, block, unblock, isBlocked, reload: load };
}
