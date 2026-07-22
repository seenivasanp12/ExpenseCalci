import { motion } from 'framer-motion'

// Dependency-free donut chart built from stacked SVG circle strokes.
// Pass `animated` to have each segment draw in one after another (Framer Motion stagger).
export default function DonutChart({ segments, size = 180, strokeWidth = 26, centerLabel, centerValue, animated = false, staggerDelay = 0.4 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0
  const arcs = total > 0 ? segments.map(seg => {
    const fraction = seg.value / total
    const dash = fraction * circumference
    const arc = { ...seg, dash, offset }
    offset += dash
    return arc
  }) : []

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {arcs.map((arc, i) => {
          const full = `${arc.dash} ${circumference - arc.dash}`
          return animated ? (
            <motion.circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDashoffset={-arc.offset}
              strokeLinecap={arcs.length > 1 ? 'butt' : 'round'}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: full }}
              transition={{ duration: 0.9, delay: i * staggerDelay, ease: 'easeOut' }}
            />
          ) : (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={full}
              strokeDashoffset={-arc.offset}
              strokeLinecap={arcs.length > 1 ? 'butt' : 'round'}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerLabel && <span className="text-xs text-gray-400 font-medium">{centerLabel}</span>}
        {centerValue}
      </div>
    </div>
  )
}
