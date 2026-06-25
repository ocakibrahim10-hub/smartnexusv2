'use client';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 8, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#EFEDF4]" aria-busy="true" aria-label="Yükleniyor">
      {/* Header */}
      <div className="bg-gray-50 border-b border-[#EFEDF4] px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className="px-4 py-3 grid gap-4 border-b border-[#EFEDF4] last:border-0"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <div
              key={ci}
              className="h-3 bg-gray-100 rounded animate-pulse"
              style={{
                width: `${40 + Math.random() * 55}%`,
                animationDelay: `${(ri * cols + ci) * 30}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded" />
            <div className="h-2 bg-gray-100 rounded w-5/6" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-6 bg-gray-100 rounded-full w-16" />
            <div className="h-6 bg-gray-100 rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
