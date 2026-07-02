import { supabase } from "@/integrations/supabase/client";

export interface LiveStream {
  id: string;
  host_user_id: string;
  title: string;
  room_name: string;
  is_active: boolean;
  viewer_count: number;
  like_count: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  host_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export async function fetchActiveStreams(): Promise<LiveStream[]> {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  const streams = (data || []) as LiveStream[];

  if (streams.length === 0) return [];

  const ids = Array.from(new Set(streams.map((s) => s.host_user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .in("user_id", ids);

  const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
  return streams.map((s) => ({
    ...s,
    host_profile: map.get(s.host_user_id)
      ? { username: (map.get(s.host_user_id) as any).username, avatar_url: (map.get(s.host_user_id) as any).avatar_url }
      : { username: "User", avatar_url: null },
  }));
}

export async function getLiveKitToken(roomName: string, role: "host" | "viewer", identityName: string) {
  const { data, error } = await supabase.functions.invoke("livekit-token", {
    body: { room_name: roomName, role, identity_name: identityName },
  });
  if (error) throw error;
  if (!data?.token || !data?.url) throw new Error("Invalid token response");
  return data as { token: string; url: string };
}

export async function createStream(title: string): Promise<LiveStream> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const roomName = `live_${user.id.slice(0, 8)}_${Date.now()}`;
  const { data, error } = await supabase
    .from("live_streams")
    .insert({
      host_user_id: user.id,
      title: title.slice(0, 100) || "Live Stream",
      room_name: roomName,
      is_active: true,
      viewer_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LiveStream;
}

export async function endStream(streamId: string) {
  await supabase
    .from("live_streams")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("id", streamId);
}

export async function incrementViewer(streamId: string, delta: 1 | -1) {
  // best-effort: use RPC-free update via select+update to avoid negatives
  const { data } = await supabase.from("live_streams").select("viewer_count").eq("id", streamId).single();
  const cur = (data as any)?.viewer_count ?? 0;
  const next = Math.max(0, cur + delta);
  await supabase.from("live_streams").update({ viewer_count: next }).eq("id", streamId);
}

export async function likeStream(streamId: string) {
  const { data } = await supabase.from("live_streams").select("like_count").eq("id", streamId).single();
  const cur = (data as any)?.like_count ?? 0;
  await supabase.from("live_streams").update({ like_count: cur + 1 }).eq("id", streamId);
}
