export const legacyMigrationTheme = {
  colors: {
    background: "#0B0712",
    sidebar: "#120A1F",
    card: "#1A112B",
    border: "#3A1F66",
    primary: "#7C3AED",
    primaryStrong: "#8B5CF6",
    text: "#F5F7FB",
    textMuted: "#94A3B8",
    textSubtle: "#64748B",
    positive: "#34D399",
    negative: "#FB7185",
    danger: "#F43F5E",
  },
} as const;

export const legacyMigrationClasses = {
  appBackground: "bg-lm-bg text-lm-text",
  sidebar: "bg-lm-sidebar border-lm-border",
  card: "bg-lm-card border-lm-border",
  primaryAction: "bg-lm-primary hover:bg-lm-primary-strong",
  mutedText: "text-lm-text-muted",
  subtleText: "text-lm-text-subtle",
  positiveText: "text-lm-positive",
  negativeText: "text-lm-negative",
  dangerText: "text-lm-danger",
} as const;
