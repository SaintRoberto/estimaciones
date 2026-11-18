const dateTimeFormatter = new Intl.DateTimeFormat('es-EC', {
  timeZone: 'America/Guayaquil', day: '2-digit', month: 'short',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

export function formatGuayaquil(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : `${dateTimeFormatter.format(date)} ECT`
}

export function ageLabel(value: string | null): string {
  if (!value) return 'No disponible'
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60_000))
  if (minutes < 2) return 'Hace menos de 2 min'
  if (minutes < 60) return `Hace ${minutes} min`
  return `Hace ${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
