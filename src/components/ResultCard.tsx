import type { QueryResult } from '../types/gis.types'

const numberFormat = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 })

export function ResultCard({ result }: { result: QueryResult }) {
  const isPopulation = result.indicator === 'poblacion'
  return (
    <section className="result-card" aria-live="polite">
      <div className="result-accent" />
      <p className="result-eyebrow">Resultado de la consulta</p>
      <h2>{isPopulation ? 'Población estimada' : 'Edificaciones estimadas'}</h2>
      <p className="result-value">
        {numberFormat.format(result.value)}
        {isPopulation && <span> personas</span>}
      </p>
      {isPopulation && <p>Estimación según la proporción de área cubierta en cada sector censal. Supone una distribución uniforme dentro del sector.</p>}
      <div className="result-source">
        <span>Censo Ecuador 2022</span>
        <span>{'Fuente oficial: INEC'}</span>
      </div>
     
    </section>
  )
}
