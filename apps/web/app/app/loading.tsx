function SkeletonCard({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-[20px] bg-slate-800/70 ${className || ""}`} />;
}

export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SkeletonCard className="h-12 w-64" />
          <SkeletonCard className="h-5 w-[28rem] max-w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonCard className="h-8 w-40" />
          <SkeletonCard className="h-4 w-56" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1.15fr_.8fr]">
        <SkeletonCard className="h-[22rem]" />
        <SkeletonCard className="h-[22rem]" />
        <SkeletonCard className="h-[22rem]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_.75fr]">
        <SkeletonCard className="h-[28rem]" />
        <SkeletonCard className="h-[28rem]" />
      </div>
    </div>
  );
}
