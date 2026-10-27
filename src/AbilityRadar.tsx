import BrandIcon, { type BrandIconName } from "./BrandIcon"
const subjectIcons: Record<string, BrandIconName> = { math: "math", chinese: "book", english: "letters", science: "leaf", social: "compass" };
import { memo, useId } from 'react'
import { SUBJECTS, type Subject } from './subject-catalog'
import type { AbilitySnapshot } from './growth'

type AbilityRadarProps = {
  snapshot: AbilitySnapshot
  selected: Subject
  onSelect?: (subject: Subject) => void
  previousValues?: Partial<Record<Subject, number>>
  compact?: boolean
}

const center = { x: 160, y: 143 }
const radius = 103

function radarPoint(value: number, index: number): [number, number] {
  const angle = -Math.PI / 2 + index * (Math.PI * 2 / 5)
  const distance = radius * Math.max(0, Math.min(100, value)) / 100
  return [
    center.x + Math.cos(angle) * distance,
    center.y + Math.sin(angle) * distance,
  ]
}

function radarPolygon(values: number[]): string {
  return values.map((value, index) => radarPoint(value, index).join(',')).join(' ')
}

function labelPoint(index: number): [number, number] {
  const angle = -Math.PI / 2 + index * (Math.PI * 2 / 5)
  const distance = radius + 24
  return [center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance]
}

function AbilityRadar({ snapshot, selected, onSelect, previousValues, compact = false }: AbilityRadarProps) {
  const gradientId = useId()
  const glowId = useId()
  const values = SUBJECTS.map((subject) => snapshot[subject.id].value)
  const previous = previousValues
    ? SUBJECTS.map((subject) => previousValues[subject.id] ?? snapshot[subject.id].value)
    : null

  return (
    <div className={`ability-radar ${compact ? 'compact' : ''}`}>
      <div className="radar-frame" aria-hidden="true">
        <svg viewBox="0 0 320 286" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#70f3e6" stopOpacity=".46" />
              <stop offset="1" stopColor="#2998d1" stopOpacity=".18" />
            </linearGradient>
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {[25, 50, 75, 100].map((level) => (
            <polygon key={level} className="radar-grid" points={radarPolygon(SUBJECTS.map(() => level))} />
          ))}
          {SUBJECTS.map((subject, index) => {
            const [x, y] = radarPoint(100, index)
            return <line key={subject.id} className="radar-axis" x1={center.x} y1={center.y} x2={x} y2={y} />
          })}
          {previous && <polygon className="radar-area previous" points={radarPolygon(previous)} />}
          <polygon
            className="radar-area current"
            points={radarPolygon(values)}
            style={{ fill: `url(#${gradientId})`, filter: `url(#${glowId})` }}
          />
          {SUBJECTS.map((subject, index) => {
            const [x, y] = radarPoint(snapshot[subject.id].value, index)
            const [labelX, labelY] = labelPoint(index)
            const isSelected = subject.id === selected
            return (
              <g key={subject.id} className={isSelected ? 'selected' : ''}>
                <circle className="radar-node-halo" cx={x} cy={y} r={isSelected ? 10 : 7} />
                <circle className="radar-node" cx={x} cy={y} r={isSelected ? 5 : 4} />
                <text className="radar-label" x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle">
                  {subject.name}
                </text>
              </g>
            )
          })}
          <circle className="radar-core" cx={center.x} cy={center.y} r="4" />
        </svg>
      </div>
      <ul className="radar-axis-list" aria-label="五學科能力值；數值只代表本站累積練習">
        {SUBJECTS.map((subject) => {
          const item = snapshot[subject.id]
          const content = (
            <>
              <span aria-hidden="true"><BrandIcon name={subjectIcons[subject.id]} /></span>
              <span><b>{subject.name}</b><small>{item.stage.name}</small></span>
              <strong>{item.value}</strong>
            </>
          )
          return (
            <li key={subject.id}>
              {onSelect ? (
                <button
                  className={subject.id === selected ? 'active' : ''}
                  type="button"
                  aria-pressed={subject.id === selected}
                  aria-label={`${subject.name}能力值 ${item.value}，${item.stage.name}`}
                  onClick={() => onSelect(subject.id)}
                >
                  {content}
                </button>
              ) : (
                <div className={subject.id === selected ? 'active' : ''}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default memo(AbilityRadar)
