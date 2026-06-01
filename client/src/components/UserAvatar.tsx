/**
 * UserAvatar – zeigt das Profilbild eines Nutzers oder die Initialen als Fallback.
 *
 * Props:
 *  - name:      Anzeigename (für Initialen-Fallback)
 *  - email:     E-Mail (für Initialen-Fallback wenn kein Name)
 *  - avatarUrl: URL des Profilbilds (optional)
 *  - size:      Größe in Tailwind-Klassen-Stil (default: "md")
 *  - className: Zusätzliche CSS-Klassen
 *  - bgColor:   Hintergrundfarbe für Initialen (default: "#76B900")
 *  - selected:  Ob der Avatar im ausgewählten Zustand ist (weiße Initialen auf transparentem Hintergrund)
 */

import { useState } from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: "w-6 h-6", text: "text-[10px]" },
  sm: { container: "w-7 h-7", text: "text-xs" },
  md: { container: "w-8 h-8", text: "text-xs" },
  lg: { container: "w-10 h-10", text: "text-sm" },
  xl: { container: "w-12 h-12", text: "text-base" },
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
  bgColor?: string;
  /** Wenn true: weißer Text, halbtransparenter Hintergrund (für aktive/ausgewählte Zustände) */
  selected?: boolean;
  /** Abrundungsgrad: "full" (Kreis, default) oder "lg" (abgerundetes Rechteck) */
  rounded?: "full" | "lg" | "xl" | "2xl";
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "md",
  className = "",
  bgColor = "#76B900",
  selected = false,
  rounded = "full",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { container, text } = SIZE_MAP[size];
  const initials = getInitials(name, email);
  const showImage = !!avatarUrl && !imgError;
  const roundedClass = `rounded-${rounded}`;

  if (showImage) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? email ?? "Avatar"}
        className={`${container} ${roundedClass} object-cover flex-shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${container} ${roundedClass} flex items-center justify-center font-bold flex-shrink-0 ${text} ${className}`}
      style={{
        backgroundColor: selected ? "rgba(255,255,255,0.2)" : bgColor,
        color: "white",
      }}
    >
      {initials}
    </div>
  );
}
