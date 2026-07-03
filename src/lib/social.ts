import { supabase } from "@/integrations/supabase/client";

// ─────────── Follows ───────────

export async function getFollowStats(userId: string) {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers || 0, following: following || 0 };
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(followingId: string): Promise<"followed" | "unfollowed"> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  if (user.id === followingId) throw new Error("SELF");

  const { error: insertErr } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: followingId });

  if (!insertErr) return "followed";

  if ((insertErr as any).code === "23505") {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);
    return "unfollowed";
  }
  throw insertErr;
}

// ─────────── Stories ───────────

export interface StoryItem {
  id: string;
  user_id: string;
  media_url: string; // storage path
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
  expires_at: string;
  signed_url?: string;
}

export interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: StoryItem[];
}

export async function fetchStoryGroups(): Promise<StoryGroup[]> {
  const { data: stories, error } = await supabase
    .from("stories")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  const list = (stories || []) as StoryItem[];
  if (list.length === 0) return [];

  const uids = Array.from(new Set(list.map((s) => s.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .in("user_id", uids);
  const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

  // Sign URLs in bulk (private bucket)
  const paths = list.map((s) => s.media_url);
  const { data: signed } = await supabase.storage
    .from("stories")
    .createSignedUrls(paths, 60 * 60);
  const smap = new Map((signed || []).map((s: any) => [s.path, s.signedUrl]));

  const withUrls = list.map((s) => ({ ...s, signed_url: smap.get(s.media_url) || "" }));

  const grouped = new Map<string, StoryGroup>();
  for (const s of withUrls) {
    const p = pmap.get(s.user_id) as any;
    if (!grouped.has(s.user_id)) {
      grouped.set(s.user_id, {
        user_id: s.user_id,
        username: p?.username || "User",
        avatar_url: p?.avatar_url || null,
        stories: [],
      });
    }
    grouped.get(s.user_id)!.stories.push(s);
  }
  // Own user first
  const { data: { user } } = await supabase.auth.getUser();
  const arr = Array.from(grouped.values());
  if (user) arr.sort((a, b) => (a.user_id === user.id ? -1 : b.user_id === user.id ? 1 : 0));
  return arr;
}

export async function createStory(file: File, caption?: string): Promise<StoryItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  if (file.size > 25 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) throw new Error("INVALID_TYPE");

  const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("stories").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      media_url: path,
      media_type: isVideo ? "video" : "image",
      caption: caption?.slice(0, 200) || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as StoryItem;
}

export async function deleteStory(story: StoryItem) {
  await supabase.storage.from("stories").remove([story.media_url]).catch(() => {});
  await supabase.from("stories").delete().eq("id", story.id);
}
