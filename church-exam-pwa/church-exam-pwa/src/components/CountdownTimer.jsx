import { useEffect, useRef, useState } from 'react'

/**
 * Beautifully-rendered circular countdown.
 * Computes remaining time from `startedAt` (ISO string) + `durationMinutes`
 * rather than counting down from a fixed number, so a page refresh or a
 * dropped connection never gives a student extra time.
 */
export default function CountdownTimer({ startedAt, durationMinutes, onExpire }) {
  const totalSeconds = durationMinutes * 60
  const expiredRef = useRef(false)
  const [remaining, setRemaining] = useState(() => computeRemaining(startedAt, totalSeconds))

  useEffect(() => {
    const tick = () => {
      const left = computeRemaining(startedAt, totalSeconds)
      setRemaining(left)
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt, totalSeconds, onExpire])

  const pct = Math.max(0, Math.min(1, remaining / totalSeconds))
  const isCritical = remaining <= Math.min(60, totalSeconds * 0.1)
  const isWarning = !isCritical && remaining <= totalSeconds * 0.25

  const radius = 46
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  const ringColor = isCritical ? '#A93A38' : isWarning ? '#C9A227' : '#2F6B4F'
  const mins = Math.floor(remaining / 60)
  const secs = Math.max(0, remaining % 60)

  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative w-[104px] h-[104px] shrink-0">
        <svg viewBox="0 0 104 104" className="w-full h-full -rotate-90">
          <circle cx="52" cy="52" r={radius} fill="none" stroke="rgba(45,27,78,0.1)" strokeWidth="7" />
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-xl font-semibold tabular-nums"
            style={{ color: ringColor }}
          >
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-indigo/70">Time remaining</p>
        <p className={`text-xs ${isCritical ? 'text-rose animate-pulse' : 'text-ink/50'}`}>
          {isCritical ? 'Hurry — submitting soon' : 'Answers save automatically'}
        </p>
      </div>
    </div>
  )
}

function computeRemaining(startedAt, totalSeconds) {
  const startMs = new Date(startedAt).getTime()
  const elapsed = (Date.now() - startMs) / 1000
  return Math.max(0, Math.round(totalSeconds - elapsed))
}
