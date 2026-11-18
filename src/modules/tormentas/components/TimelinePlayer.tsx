import { useEffect, useState } from 'react'
import { formatGuayaquil } from './stormFormatters'

interface Props { times: string[]; index: number; onChange: (index: number) => void }

export function TimelinePlayer({ times, index, onChange }: Props) {
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing || times.length < 2) return
    const timer = window.setInterval(() => onChange(index >= times.length - 1 ? 0 : index + 1), 900)
    return () => window.clearInterval(timer)
  }, [playing, index, times.length, onChange])

  const latest = times.length - 1
  return (
    <div className="storm-timeline" aria-label="Línea de tiempo satelital">
      <div className="timeline-buttons">
        <button type="button" onClick={() => setPlaying((value) => !value)} disabled={!times.length} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? 'Ⅱ' : '▶'}</button>
        <button type="button" onClick={() => onChange(Math.max(0, index - 1))} disabled={index <= 0} aria-label="Anterior">‹</button>
        <button type="button" onClick={() => onChange(Math.min(latest, index + 1))} disabled={index >= latest} aria-label="Siguiente">›</button>
      </div>
      <div className="timeline-track">
        <div><strong>Secuencia de nubes</strong><span>{times[index] ? formatGuayaquil(times[index]) : 'Consultando NASA GIBS…'}</span></div>
        <input type="range" min="0" max={Math.max(0, latest)} value={Math.max(0, index)} onChange={(event) => onChange(Number(event.target.value))} disabled={!times.length} />
        <div className="timeline-scale"><span>−2 h</span><span>Ahora</span></div>
      </div>
      <button className="latest-frame" type="button" onClick={() => onChange(latest)} disabled={!times.length || index === latest}>Más reciente</button>
    </div>
  )
}
