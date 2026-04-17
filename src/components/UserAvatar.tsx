import { useState } from "react";
import { getAvatarColor, getInitials } from "@/components/chat/ChatHelpers";

interface Props {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  online?: boolean;
  ring?: boolean;
  className?: string;
}

const sizeMap: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-8 w-8 text-[10px]",
  sm: "h-10 w-10 text-xs",
  md: "h-11 w-11 text-xs",
  lg: "h-14 w-14 text-sm",
  xl: "h-20 w-20 text-xl",
  "2xl": "h-28 w-28 text-3xl",
};

const dotSize: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
  xl: "h-4 w-4",
  "2xl": "h-5 w-5",
};

export function UserAvatar({
  userId,
  username,
  avatarUrl,
  size = "md",
  online,
  ring,
  className = "",
}: Props) {
  const [errored, setErrored] = useState(false);
  const showImage = avatarUrl && !errored;

  const inner = showImage ? (
    <img
      src={avatarUrl}
      alt={username}
      onError={() => setErrored(true)}
      className="h-full w-full rounded-full object-cover"
      loading="lazy"
    />
  ) : (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${getAvatarColor(
        userId || username
      )}`}
    >
      {getInitials(username || "?")}
    </div>
  );

  return (
    <div className={`relative shrink-0 ${className}`}>
      {ring ? (
        <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-primary via-primary/70 to-primary/30 p-[2px] shadow-[0_0_24px_-4px_hsl(var(--primary)/0.55)]`}>
          <div className="h-full w-full rounded-full bg-card overflow-hidden">{inner}</div>
        </div>
      ) : (
        <div className={`${sizeMap[size]} rounded-full overflow-hidden`}>{inner}</div>
      )}
      {online && (
        <div
          className={`absolute -bottom-0.5 -right-0.5 ${dotSize[size]} rounded-full bg-[hsl(142_70%_48%)] border-2 border-background shadow-[0_0_8px_hsl(142_70%_48%/0.6)]`}
        />
      )}
    </div>
  );
}
