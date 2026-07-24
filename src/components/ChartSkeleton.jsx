// Shimmering placeholder shaped like a donut chart + legend, shown while
// Categories/Calculate data is loading (instead of a generic spinner).
export default function ChartSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex justify-center py-2">
        <div className="relative w-[180px] h-[180px] rounded-full bg-gray-100">
          <div className="absolute inset-[26px] rounded-full bg-white" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-200" />
              <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-gray-100" />
              <div className="flex-1 h-3 rounded-full bg-gray-100" />
              <div className="w-14 h-3 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
