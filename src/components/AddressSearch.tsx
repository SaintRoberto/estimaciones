import { AutoComplete, Input, message } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buscarDirecciones } from '../services/geocodingService'
import type { SearchLocation } from '../types/gis.types'

interface Props {
  onSelect: (location: SearchLocation) => void
}

export function AddressSearch({ onSelect }: Props) {
  const [value, setValue] = useState('')
  const [results, setResults] = useState<SearchLocation[]>([])
  const [loading, setLoading] = useState(false)
  const latestResults = useRef<SearchLocation[]>([])

  useEffect(() => {
    if (value.trim().length < 3) {
      setResults([])
      latestResults.current = []
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const found = await buscarDirecciones(value, controller.signal)
        setResults(found)
        latestResults.current = found
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          message.error(error instanceof Error ? error.message : 'No se pudo completar la búsqueda.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  const options = useMemo(() => results.map((item) => ({ value: item.id, label: item.label })), [results])

  return (
    <AutoComplete
      className="address-search"
      value={value}
      options={options}
      onSearch={setValue}
      onChange={setValue}
      onSelect={(id: string) => {
        const selected = latestResults.current.find((item) => item.id === id)
        if (selected) {
          setValue(selected.label)
          onSelect(selected)
        }
      }}
      notFoundContent={value.trim().length >= 3 && !loading ? 'Sin resultados' : null}
    >
      <Input.Search
        size="large"
        loading={loading}
        placeholder="Buscar dirección, barrio o ciudad en Ecuador"
        aria-label="Buscar dirección"
      />
    </AutoComplete>
  )
}
