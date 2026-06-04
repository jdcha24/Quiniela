// components/avatar/UserAvatar.tsx
// Unified avatar display component — uses avatarConfig if present, else falls back to seed+style
"use client";

import { memo } from "react";
import { getAvatarUrlFromConfig, defaultAvatarConfig } from "@/lib/utils/dicebear";
import type { AvatarConfig } from "@/lib/utils/dicebear";

interface UserAvatarProps {
  /** DiceBear seed (usually the nickname) */
  seed: string;
  /** Full config if available (new users) */
  config?: AvatarConfig;
  /** Legacy style (fallback) */
  style?: string;
  size?: number;
  className?: string;
  alt?: string;
}

export const UserAvatar = memo(function UserAvatar({
  seed,
  config,
  style,
  size = 40,
  className = "",
  alt = "Avatar",
}: UserAvatarProps) {
  const resolvedConfig: AvatarConfig = config
    ? { ...config, seed }
    : defaultAvatarConfig(seed);

  const url = getAvatarUrlFromConfig(resolvedConfig, size);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      width={size}
      height={size}
      className={className}
      style={{
        background: resolvedConfig.backgroundColor
          ? `#${resolvedConfig.backgroundColor}`
          : "#1a1a28",
      }}
    />
  );
});
