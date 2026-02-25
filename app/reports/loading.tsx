export default function ReportsLoading() {
  return (
    <div className="flex flex-col min-h-dvh">
      <div className="bg-olive px-5 pt-4 pb-5 flex-shrink-0">
        <div className="h-5 w-32 bg-white/20 rounded mb-3" />
        <div className="h-6 w-24 bg-white/20 rounded mb-1" />
        <div className="h-4 w-48 bg-white/15 rounded" />
      </div>
      <div className="px-4 pt-4 pb-2 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-16 bg-fog rounded-full animate-pulse" />
        ))}
      </div>
      <div className="px-4 py-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-3.5 border border-border animate-pulse">
            <div className="h-4 bg-fog rounded w-3/4 mb-2" />
            <div className="h-3 bg-fog rounded w-1/2 mb-2" />
            <div className="h-5 bg-fog rounded w-1/4 mb-2" />
            <div className="h-3 bg-fog rounded w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
