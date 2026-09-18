import type { LucideIcon } from "lucide-react";
import {
  Bath,
  Camera,
  Clapperboard,
  Film,
  Frame,
  Gem,
  GraduationCap,
  Heart,
  Home,
  Palette,
  PartyPopper,
  Plane,
  Shirt,
  Sparkles,
} from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  WEDDING: Gem,
  PRAWEDDING: Camera,
  ENGAGEMENT: Heart,
  EVENT: PartyPopper,
  "WEDDING CONTENT CREATOR": Clapperboard,
  GRADUATION: GraduationCap,
};

const ADDON_ICON_MAP: Record<string, LucideIcon> = {
  SIRAMAN: Bath,
  "TRADITIONAL_CEREMONY_(SIRAMAN)_PHOTO_ONLY": Bath,
  "TRADITIONAL_CEREMONY_(SIRAMAN)_PHOTO_&_VIDEO": Bath,
  EXTRA_PRINTS: Frame,
  "CETAK_PEMBESARAN_16RP": Frame,
  "CETAK_PEMBESARAN_12RP": Frame,
  "CETAK_PEMBESARAN_8RP": Frame,
  TEASER_VIDEO: Clapperboard,
  "VIDEO_TEASER_1_MENIT": Clapperboard,
  "PENAMBAHAN_CLIP_VIDEO_1_MENIT": Film,
  "VIDEO_CINEMATIC_2_MENIT": Film,
  "VIDEO_CINEMATIC_3_MENIT": Film,
  "VIDEO_CINEMATIC_3_MENIT_(DRONE)": Plane,
  MAKEUP: Sparkles,
  "1_WARDROBE": Shirt,
  "2_WARDROBE": Shirt,
  "PENAMBAHAN_BACKGROUND_OUTDOOR_3X4": Palette,
  "PENAMBAHAN_MINI_STUDIO_6X6": Home,
};

const ICON_BY_NAME: Record<string, LucideIcon> = {
  Gem,
  Camera,
  Heart,
  Clapperboard,
  GraduationCap,
  PartyPopper,
  Bath,
  Film,
  Frame,
  Home,
  Palette,
  Plane,
  Shirt,
  Sparkles,
};

export const AVAILABLE_CATEGORY_ICONS: { key: string; label: string }[] = [
  { key: "Gem", label: "Berlian" },
  { key: "Camera", label: "Kamera" },
  { key: "Heart", label: "Hati" },
  { key: "PartyPopper", label: "Pesta" },
  { key: "Clapperboard", label: "Clapperboard" },
  { key: "GraduationCap", label: "Toga" },
  { key: "Film", label: "Film" },
  { key: "Frame", label: "Frame" },
  { key: "Sparkles", label: "Sparkles" },
  { key: "Shirt", label: "Shirt" },
  { key: "Palette", label: "Palette" },
  { key: "Home", label: "Home" },
  { key: "Plane", label: "Plane" },
  { key: "Bath", label: "Bath" },
];

export function CategoryIcon({
  name,
  className,
  icon,
}: {
  name: string;
  className?: string;
  icon?: string | null;
}) {
  if (icon) {
    const Icon = ICON_BY_NAME[icon] ?? Camera;
    return <Icon className={className} aria-hidden="true" />;
  }
  const Icon = CATEGORY_ICON_MAP[name.toUpperCase()] ?? Camera;
  return <Icon className={className} aria-hidden="true" />;
}

export function AddonIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon =
    ADDON_ICON_MAP[name.replace(/\s+/g, "_").toUpperCase()] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}