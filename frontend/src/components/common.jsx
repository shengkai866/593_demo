import { useState } from 'react'

// [file.py:3] or [file.py:2-4] become clickable code links; `x` becomes inline code.
const TOKEN = /\[([\w./-]+\.py):(\d+)(?:-(\d+))?\]|`([^`]+)`/g

export function parseRef(ref) {
  const m = /^([\w./-]+\.py):(\d+)(?:-(\d+))?$/.exec(ref)
  if (!m) return null
  return { file: m[1], start: Number(m[2]), end: Number(m[3] || m[2]) }
}

export function refLabel({ file, start, end }) {
  return `${file} ${start === end ? `line ${start}` : `lines ${start}-${end}`}`
}

export function RichText({ text, onRef, className = '' }) {
  if (!text) return null
  const out = []
  let last = 0
  let m
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) {
      const r = { file: m[1], start: Number(m[2]), end: Number(m[3] || m[2]) }
      out.push(<RefChip key={m.index} r={r} onRef={onRef} />)
    } else {
      out.push(<code key={m.index}>{m[4]}</code>)
    }
    last = TOKEN.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return <div className={`rich ${className}`}>{out}</div>
}

export function RefChip({ r, onRef, label }) {
  return (
    <button type="button" className="ref-chip" title="Show this code" onClick={() => onRef && onRef(r)}>
      {label || refLabel(r)}
    </button>
  )
}

const KW = new Set(('def return for in if elif else while and or not import from as True False None ' +
  'class try except finally with lambda pass break continue is print len range enumerate').split(' '))
const PY = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/gm

export function PyLine({ text }) {
  const out = []
  let last = 0
  let m
  PY.lastIndex = 0
  while ((m = PY.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<span key={m.index} className="tok-com">{m[1]}</span>)
    else if (m[2]) out.push(<span key={m.index} className="tok-str">{m[2]}</span>)
    else if (m[3]) out.push(<span key={m.index} className="tok-num">{m[3]}</span>)
    else if (KW.has(m[4])) out.push(<span key={m.index} className="tok-kw">{m[4]}</span>)
    else out.push(m[4])
    last = PY.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out.length ? out : ' '}</>
}

export function SourceBadge({ source }) {
  return source === 'ai'
    ? <span className="pill pill-ok small">AI</span>
    : <span className="pill pill-warn small" title="No API key set, or the AI call failed">Scripted (AI offline)</span>
}

export function Collapsible({ title, children, defaultOpen = false, right }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="collapsible">
      <div className="collapsible-head">
        <button type="button" className="btn-link" onClick={() => setOpen(!open)}>
          {open ? '▾' : '▸'} {title}
        </button>
        {right}
      </div>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

export function timeAgo(ts) {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const GOAL_NAMES = { understand: 'Understand the code', fix: 'Fix the code' }
export function goalName(g) {
  return GOAL_NAMES[g] || g
}
