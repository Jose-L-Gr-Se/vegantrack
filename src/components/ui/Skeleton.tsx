export function SkeletonCard() {
  return (
    <div className="card p-3 flex items-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-surface-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-surface-200 rounded-full w-3/4" />
        <div className="h-2.5 bg-surface-100 rounded-full w-1/2" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 bg-surface-200 rounded-full w-10 ml-auto" />
        <div className="h-2 bg-surface-100 rounded-full w-14" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
