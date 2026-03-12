import type { LucideIcon } from "lucide-react";

export type LegacyNavTone = "default" | "success" | "danger";

export type LegacyNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  tone?: LegacyNavTone;
};

export type LegacyNavigationSection = {
  id: string;
  title?: string;
  items: LegacyNavigationItem[];
};
