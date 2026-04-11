export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-white/[0.06] rounded-lg animate-pulse ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s infinite',
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="glass-card p-5">
      <Skeleton className="w-9 h-9 rounded-lg mb-3" />
      <Skeleton className="h-7 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
