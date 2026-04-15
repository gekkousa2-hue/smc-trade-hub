export const EMOJI_LIST = [
  "😀","😂","🤣","😍","🥰","😎","🤔","😢","😡","👍",
  "👎","🔥","💰","📈","📉","💎","🚀","💪","🎯","⚡",
  "✅","❌","⭐","💥","🏆","🤝","👏","🙏","💵","📊",
];

export const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

export const getAvatarColor = (id: string) => {
  const colors = [
    "from-primary/90 to-primary/50",
    "from-[hsl(142_60%_45%)] to-[hsl(142_60%_35%)]",
    "from-[hsl(210_80%_55%)] to-[hsl(210_80%_40%)]",
    "from-[hsl(270_60%_55%)] to-[hsl(270_60%_40%)]",
    "from-[hsl(330_60%_55%)] to-[hsl(330_60%_40%)]",
    "from-[hsl(20_80%_55%)] to-[hsl(20_80%_40%)]",
  ];
  return colors[id.charCodeAt(0) % colors.length];
};

export const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" });

export const formatRecTime = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

export const formatLastSeen = (dateStr?: string) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "hozirgina";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} daqiqa oldin`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} soat oldin`;
  return new Date(dateStr).toLocaleDateString("uz");
};
