import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export interface UserSettings {
  language: string;
  theme: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  show_online_status: boolean;
  show_last_seen: boolean;
  show_read_receipts: boolean;
}

const DEFAULTS: UserSettings = {
  language: "uz",
  theme: "dark",
  notifications_enabled: true,
  sound_enabled: true,
  vibration_enabled: true,
  show_online_status: true,
  show_last_seen: true,
  show_read_receipts: true,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const s: UserSettings = {
        language: data.language,
        theme: data.theme,
        notifications_enabled: data.notifications_enabled,
        sound_enabled: data.sound_enabled,
        vibration_enabled: data.vibration_enabled,
        show_online_status: data.show_online_status,
        show_last_seen: data.show_last_seen,
        show_read_receipts: data.show_read_receipts,
      };
      setSettings(s);
      if (s.language && s.language !== i18n.language) {
        i18n.changeLanguage(s.language);
      }
    } else {
      // Create defaults if missing
      await supabase.from("user_settings").insert({ user_id: user.id });
    }
    setLoading(false);
  }, [i18n]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSettings(prev => ({ ...prev, ...patch }));
    if (patch.language) i18n.changeLanguage(patch.language);
    await supabase.from("user_settings").update(patch).eq("user_id", user.id);
  }, [i18n]);

  return { settings, loading, update, reload: load };
}
