import type { Farm } from '../service/farm/responses'
import type { Paddock } from '../service/cattle/responses'
import type { MapPolygon } from '../components/map/farm-map/farm-map'
import type { LngLat } from './geo'
import { boundsOf, centerOf } from './geo'

const BRAZILIAN_MIDWEST: LngLat = [-54.0433, -19.5307]

export function mappedPaddocks(paddocks: Paddock[]): MapPolygon[] {
  return paddocks
    .filter((paddock) => paddock.boundary?.space === 'geo')
    .map((paddock) => ({
      id: paddock.id,
      name: paddock.name,
      points: paddock.boundary!.points,
      occupied: paddock.occupancies.length > 0,
    }))
}

export function farmHome(farm: Farm | undefined, polygons: MapPolygon[]): LngLat {
  const drawn = boundsOf(polygons.flatMap((polygon) => polygon.points))
  if (drawn) return centerOf(drawn)
  if (farm?.latitude && farm.longitude) return [Number(farm.longitude), Number(farm.latitude)]
  return BRAZILIAN_MIDWEST
}

export function hectaresLabel(value: string | null): string {
  return value ? `${Number(value).toLocaleString('pt-BR')} ha` : 'não informada'
}

export function paddockAreaSummary(paddock: Paddock): string {
  const usable = `útil ${hectaresLabel(paddock.usableAreaHa)}`
  const computed = paddock.boundary?.computedAreaHa
  if (!computed) return usable
  return `${usable} · contorno ${hectaresLabel(computed)}`
}

export function divergenceNotice(paddock: Paddock): string | null {
  const divergence = paddock.areaDivergence
  if (!divergence?.significant) return null
  const direction = divergence.differencePercent > 0 ? 'maior' : 'menor'
  return `O contorno mede ${hectaresLabel(divergence.computedAreaHa)}, ${Math.abs(divergence.differencePercent).toLocaleString('pt-BR')}% ${direction} que a área útil informada. O traçado engloba capão, pedra, água e carreador; as regras continuam usando a sua área útil.`
}
