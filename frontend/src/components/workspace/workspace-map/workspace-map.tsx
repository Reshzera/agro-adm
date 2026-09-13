import { useQuery } from '@tanstack/react-query'
import type { WorkspaceMapView } from '../../../workspace/workspace.commands'
import { cattleEndpoints } from '../../../service/cattle'
import { farmEndpoints } from '../../../service/farm'
import type { Paddock } from '../../../service/cattle/responses'
import { FarmMap, type MapPolygon } from '../../map/farm-map/farm-map'
import { farmHome, mappedPaddocks, paddockAreaSummary } from '../../../map/paddocks'
import styles from './workspace-map.module.scss'

export function WorkspaceMap({ view }: { view: WorkspaceMapView }) {
  const paddocks = useQuery({
    queryKey: ['workspace', 'paddocks'],
    queryFn: async ({ signal }) => (await cattleEndpoints.paddocks(signal)).data,
  })
  const farm = useQuery({
    queryKey: ['farm'],
    queryFn: async ({ signal }) => (await farmEndpoints.current(signal)).data,
  })

  if (paddocks.isPending || farm.isPending)
    return <p className={styles.status}>Abrindo o mapa da fazenda…</p>
  if (paddocks.isError || farm.isError)
    return <p className={styles.error}>Não foi possível carregar o mapa.</p>

  const polygons: MapPolygon[] = mappedPaddocks(paddocks.data)
  const framed = view.paddockIds.filter((id) =>
    polygons.some((polygon) => polygon.id === id),
  )
  const missing = view.paddockIds.filter((id) => !framed.includes(id))
  const listed: Paddock[] = (framed.length
    ? paddocks.data.filter((paddock) => framed.includes(paddock.id))
    : paddocks.data
  ).filter((paddock) => paddock.boundary !== null)

  if (polygons.length === 0)
    return (
      <p className={styles.status}>
        Nenhum pasto tem contorno desenhado ainda. O desenho é feito na tela de rebanho.
      </p>
    )

  return (
    <div className={styles.map}>
      <FarmMap
        polygons={polygons}
        home={farmHome(farm.data, polygons)}
        focusIds={framed}
        label="Mapa da fazenda com os contornos dos pastos"
      />
      <ul className={styles.legend}>
        {listed.map((paddock) => (
          <li key={paddock.id} data-framed={framed.includes(paddock.id) || undefined}>
            <strong>{paddock.name}</strong>
            <span>{paddockAreaSummary(paddock)}</span>
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <p className={styles.status}>
          {missing.length === 1 ? 'Um pasto pedido não tem contorno' : `${missing.length} pastos pedidos não têm contorno`} e ficou de fora do enquadramento.
        </p>
      )}
    </div>
  )
}
