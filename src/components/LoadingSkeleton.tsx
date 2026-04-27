"use client";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-28 rounded-xl" />
      </div>

      <div className="flex gap-2">
        <SkeletonBlock className="h-10 w-36 rounded-xl" />
        <SkeletonBlock className="h-10 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-56 w-full rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-56 w-full rounded-xl" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <SkeletonBlock className="h-4 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <SkeletonBlock key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 space-y-2">
        <SkeletonBlock className="h-4 w-24 bg-emerald-200" />
        <SkeletonBlock className="h-16 w-full bg-emerald-100 rounded-xl" />
      </div>
    </div>
  );
}

export function AnalyzingOverlay() {
  const steps = [
    "PII 마스킹 처리 중...",
    "GPT-4o 발달 분석 중...",
    "민감기 신호 탐지 중...",
    "교구 추천 생성 중...",
  ];

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
        <div className="w-12 h-12 mx-auto">
          <svg className="animate-spin w-12 h-12 text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
        <p className="font-semibold text-slate-800">관찰일지 분석 중</p>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <p key={i} className="text-xs text-slate-500">{step}</p>
          ))}
        </div>
        <p className="text-xs text-slate-400">약 10-20초 소요됩니다</p>
      </div>
    </div>
  );
}
