---
name: Settings & i18n
description: Settings page with sub-routes (language, blocked users), i18n via react-i18next (uz/en/ru), user_settings & blocked_users tables, block from chat header
type: feature
---

## Settings architecture
- ProfilePage holds `subPage` state — switches between profile, settings, language, blocked, edit-profile
- SettingsPage groups items by section (Account / Preferences / Security / Help) — items with `soon: true` are disabled placeholders
- All headers use sticky pattern with back button + glass bg

## i18n
- `src/lib/i18n.ts` — initializes react-i18next with uz/en/ru
- localStorage key: `app_lang` (caches choice across sessions)
- DB `user_settings.language` is source of truth — synced via `useUserSettings` hook on load
- Use `const { t } = useTranslation()` then `t("namespace.key")`

## Hooks
- `useUserSettings` — reads/writes `user_settings` row, also calls `i18n.changeLanguage` when language changes
- `useBlockedUsers` — `block(id)`, `unblock(id)`, `isBlocked(id)`, `blocked[]` with profile join

## Blocking
- DB function `is_blocked_between(a, b)` — used by messages INSERT RLS to deny sending
- ChatHeader has `MoreVertical` menu with Block/Unblock toggle
- Block list shown on BlockedUsersPage with avatar + unblock button

## Tables
- `user_settings` — language, theme, notifications_enabled, sound_enabled, vibration_enabled, show_online_status, show_last_seen, show_read_receipts
- `blocked_users` — blocker_id, blocked_id (UNIQUE pair, CHECK no self-block)
- `handle_new_user()` trigger inserts default settings row on signup
