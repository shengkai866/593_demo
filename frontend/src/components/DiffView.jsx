import { useState } from 'react'
import { PyLine } from './common.jsx'

const CONTEXT = 3

/** Unified diff with line numbers; unchanged code is collapsible but always reachable. */
export default function DiffView({ rows, onLine }) {
  const [full, setFull] = useState(false)
  const [opened, setOpened] = useState({})

  const changed = rows.map((r, i) => (r.t !== 'same' ? i : -1)).filter((i) => i >= 0)
  const near = (i) => changed.some((c) => Math.abs(c - i) <= CONTEXT)

  const blocks = []
  let gap = []
  const flush = (key) => {
    if (!gap.length) return
    const g = gap
    if (opened[key]) g.forEach((x) => blocks.push({ row: x.r, i: x.i }))
    else blocks.push({ gap: g.length, key })
    gap = []
  }
  rows.forEach((r, i) => {
    if (full || near(i) || !changed.length) {
      flush(`g${i}`)
      blocks.push({ row: r, i })
    } else gap.push({ r, i })
  })
  flush('gend')

  return (
    <div className="diff">
      <div className="diff-head">
        <span className="muted small">− before · + after</span>
        <button className="btn-link small" onClick={() => setFull(!full)}>
          {full ? 'Show only nearby lines' : 'Show whole file'}
        </button>
      </div>
      <pre className="code diff-body">
        {blocks.map((b) =>
          b.gap ? (
            <div key={b.key} className="diff-gap">
              <button className="btn-link small" onClick={() => setOpened({ ...opened, [b.key]: true })}>
                ··· {b.gap} unchanged line{b.gap > 1 ? 's' : ''} (show)
              </button>
            </div>
          ) : (
            <div key={b.i} className={`code-line diff-${b.row.t}`} onClick={() => onLine && onLine(b.row)}>
              <span className="ln">{b.row.a ?? ''}</span>
              <span className="ln">{b.row.b ?? ''}</span>
              <span className="sign">{b.row.t === 'add' ? '+' : b.row.t === 'del' ? '−' : ' '}</span>
              <span className="lc"><PyLine text={b.row.text} /></span>
            </div>
          ),
        )}
      </pre>
    </div>
  )
}
