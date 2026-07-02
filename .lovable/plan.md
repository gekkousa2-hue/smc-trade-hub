# Jonli Efir (Live Stream) tizimi

Grafik bo'limi olib tashlanadi va o'rniga TikTok uslubidagi vertikal jonli efir feed qo'yiladi. Har kim efirga chiqishi, ko'p sonli tomoshabin ko'rishi va real vaqtda chat yozishi mumkin bo'ladi.

## Texnik yondashuv

Ko'p sonli tomoshabin (istagancha odam) uchun sof WebRTC (peer-to-peer) yaramaydi — media server (SFU) kerak. **LiveKit Cloud**ni tanlayapman:
- WebRTC asosida, past kechikish (~200ms)
- Bepul tarif: 100 GB bandwidth/oy, 100 minut streaming/oy — sinovga yetadi
- Bir efirga cheksiz viewer olishi mumkin
- Vertical/mobile video uchun mukammal

**Sizdan kerak:** LiveKit Cloud'da bepul akkaunt ochib (livekit.io) API Key, API Secret va WS URL bering — men ularni Cloud secretsga qo'shaman.

Muqobil (agar LiveKit'ni xohlamasangiz): Mux Live Streaming (HLS, 5-15s kechikish, chat interaktivroq bo'lmaydi) yoki Agora.

## Foydalanuvchi tajribasi

1. Pastdagi navigatsiyada **"Grafik"** o'rnida **"Live"** tab (Radio ikonkasi + "LIVE" belgi).
2. TikTok uslubida vertikal to'liq ekran feed — yuqoriga surish yangi efirga o'tkazadi.
3. O'ng pastda **"Go Live"** tugmasi — bosganda kamera+mikrofonga ruxsat so'raydi, sarlavha kiritiladi, efir boshlanadi.
4. Har efir ustida: streamer avatari + username (bosilsa profil), viewer count, ❤️ like tugmasi, o'ng tomonda jonli chat.
5. Efir tugatilganda avtomatik keyingi live'ga o'tadi. Live yo'q bo'lsa — bo'sh holat "Hozircha hech kim efirda emas".

## Nima qilinadi

**Database (yangi migratsiya):**
- `live_streams` jadvali: host_user_id, title, room_name, is_active, viewer_count, started_at, ended_at
- `stream_messages` jadvali: stream_id, user_id, content, created_at (jonli chat)
- RLS: live stream'ni hamma ko'radi, faqat host o'chira oladi. Chatni auth qilingan userlar yoza oladi.
- Realtime: ikkala jadval uchun ham yoqiladi (viewer va chat yangilanishi uchun)

**Edge Function `livekit-token`:**
- Foydalanuvchi uchun LiveKit JWT token yaratadi (host yoki viewer roli bilan)
- API Secret'ni faqat server tomonida ishlatadi

**Frontend:**
- `LiveFeedPage.tsx` — vertikal swipe feed (Framer Motion drag)
- `LiveStreamPlayer.tsx` — LiveKit `<LiveKitRoom>` + `<VideoRenderer>` viewer sifatida
- `GoLivePage.tsx` — kamera preview, sarlavha, "Start Streaming" tugmasi
- `LiveChat.tsx` — o'ng panelda real vaqt chat (Supabase Realtime orqali)
- `BottomNav.tsx` — "Grafik" o'rnida "Live" tab, pulsing red LIVE badge
- `Index.tsx`, `XauusdChart.tsx` — o'chiriladi
- `MainLayout.tsx` — chart tab o'rnida live tab

**Package:** `@livekit/components-react`, `livekit-client`, `livekit-server-sdk` (edge function uchun)

## Cheklovlar / Ochiq savollar

- LiveKit bepul tarifi tugasa — to'lov kerak (yoki self-host).
- Efirlar recording qilinmaydi (agar xohlasangiz keyin qo'shamiz).
- Moderatsiya (nomaqbul content) yo'q — keyin qo'shish mumkin.
- iOS Safari'da WebRTC ba'zan capricious — sinov kerak.

## Tasdiqlaganingizdan keyin
Migratsiyani boshlaymiz, so'ng LiveKit kalitlarini so'rayman.