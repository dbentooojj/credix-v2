import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

type SvgIconProps = IconProps & {
  children: ReactNode;
};

function SvgIcon({ className, children }: SvgIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </SvgIcon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="m6 9 6 6 6-6" />
    </SvgIcon>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="m9 6 6 6-6 6" />
    </SvgIcon>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <rect height="7" rx="1.6" width="7" x="3" y="3" />
      <rect height="7" rx="1.6" width="7" x="14" y="3" />
      <rect height="7" rx="1.6" width="7" x="3" y="14" />
      <rect height="7" rx="1.6" width="7" x="14" y="14" />
    </SvgIcon>
  );
}

export function ChartBarsIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-8" />
      <path d="M22 19V3" />
    </SvgIcon>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </SvgIcon>
  );
}

export function LoansIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M2 17h20" />
      <path d="M6 13V7a2 2 0 0 1 2-2h9l5 5v3" />
      <path d="M14 5v5h5" />
      <path d="M8 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </SvgIcon>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect height="18" rx="3" width="18" x="3" y="4" />
      <path d="M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </SvgIcon>
  );
}

export function FileTextIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
      <path d="M8 9h3" />
    </SvgIcon>
  );
}

export function ArrowUpIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M12 21V3" />
      <path d="m17 8-5-5-5 5" />
      <path d="M5 21h14" />
    </SvgIcon>
  );
}

export function ArrowDownIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M12 3v18" />
      <path d="m7 16 5 5 5-5" />
      <path d="M5 3h14" />
    </SvgIcon>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </SvgIcon>
  );
}

export function ArrowDownLeftIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M17 7 7 17" />
      <path d="M15 17H7V9" />
    </SvgIcon>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5.5A2.5 2.5 0 0 1 3 16.5z" />
      <path d="M3 8h18" />
      <path d="M16.5 13h2.5" />
    </SvgIcon>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V11a5 5 0 1 1 10 0v3.2a2 2 0 0 0 .6 1.4L19 17h-4" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </SvgIcon>
  );
}

export function AlertCircleIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </SvgIcon>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </SvgIcon>
  );
}

export function PulseIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M3 12h4l2.2-5 3.6 10 2.2-5H21" />
    </SvgIcon>
  );
}

export function TrendUpIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="m3 17 6-6 4 4 7-8" />
      <path d="M14 7h6v6" />
    </SvgIcon>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </SvgIcon>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M12 3 5 6v5c0 5 3.4 8.4 7 10 3.6-1.6 7-5 7-10V6z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </SvgIcon>
  );
}

export function HelpCircleIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.8 2.8 0 1 1 4.4 2.3c-.9.6-1.4 1.1-1.4 2.2" />
      <path d="M12 17h.01" />
    </SvgIcon>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </SvgIcon>
  );
}

export function CalendarCheckIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect height="18" rx="3" width="18" x="3" y="4" />
      <path d="M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </SvgIcon>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <SvgIcon className={className}>
      <path d="M20 11a8 8 0 0 0-14.9-3" />
      <path d="M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.9 3" />
      <path d="M20 20v-5h-5" />
    </SvgIcon>
  );
}
