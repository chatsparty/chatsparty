import Avatar from "boring-avatars";
import { useMemo } from "react";

interface BoringAvatarGridProps {
  count?: number;
  size?: number;
  variant?: "marble" | "beam" | "pixel" | "sunset" | "ring" | "bauhaus";
  colors?: string[];
  className?: string;
  animated?: boolean;
}

export function BoringAvatarGrid({
  count = 12,
  size = 60,
  variant = "beam",
  colors = ["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"],
  className = "",
  animated = false,
}: BoringAvatarGridProps) {
  const avatars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `Avatar-${i}-${Math.random()}`,
      delay: Math.random() * 2,
      duration: 15 + Math.random() * 10,
    }));
  }, [count]);

  return (
    <div className={`grid grid-cols-3 sm:grid-cols-4 gap-4 ${className}`}>
      {avatars.map((avatar) => (
        <div
          key={avatar.id}
          className={`${
            animated
              ? "animate-float"
              : ""
          }`}
          style={{
            animationDelay: `${avatar.delay}s`,
            animationDuration: `${avatar.duration}s`,
          }}
        >
          <Avatar
            size={size}
            name={avatar.name}
            variant={variant}
            colors={colors}
          />
        </div>
      ))}
    </div>
  );
}