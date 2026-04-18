# Memory: index.md
Updated: now

# Project Memory

## Core
- Dark gold/terminal aesthetic, glassmorphism. Space Grotesk (headers) & JetBrains Mono (code).
- NO 'SMC' terms/education sections. Use 'Elite Trader', 'Trade Chat'.
- Stack: Supabase (Auth auto-confirm, DB, Storage) & Gemini (Trade-AI).
- App layout: Bottom Nav (Grafik, Trade-AI, Chat, Profil). Chart is full-screen, white-labeled.
- All avatars use `<UserAvatar>` (src/components/UserAvatar.tsx). Avatar uploads via `avatars` storage bucket.
- i18n via react-i18next (uz/en/ru). All new UI strings use `t("key")`. Lang stored in `user_settings.language` + localStorage `app_lang`.

## Memories
- [Settings & i18n](mem://features/settings) — Settings page with sub-routes, language switcher, blocked users, user_settings & blocked_users DB tables
- [Premium UI System](mem://design/premium-ui) — Dark gold premium redesign, UserAvatar component, avatars bucket, animated bottom nav with unread badge
- [Design System & Aesthetic](mem://style/aesthetic) — Dark gold terminal aesthetic, typography, and strict no-SMC branding
- [Chat System](mem://features/chat-system) — Professional Direct Messaging with media, voice/video, and optimistic updates
- [Charting](mem://tech-stack/charting) — TradingView XAUUSD chart implementation and layout
- [Trade-AI Agent](mem://features/trade-ai) — Gemini-powered analysis for charts and text, outputting custom signal cards
- [App Navigation](mem://layout/navigation) — Bottom Navigation Bar with Framer Motion transitions
- [Profile](mem://features/profile) — Premium profile page with mock balance, stats, and Supabase sync
- [Backend & Infrastructure](mem://tech-stack/backend) — Supabase configuration, DB RPCs, Auth, and Storage
