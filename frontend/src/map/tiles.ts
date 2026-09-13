const DEFAULT_SATELLITE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const template = import.meta.env.VITE_SATELLITE_TILES ?? DEFAULT_SATELLITE_TILES

export const satelliteCredit =
  import.meta.env.VITE_SATELLITE_TILES_CREDIT ?? 'Imagem de satélite: Esri World Imagery'

export function satelliteTileUrl(x: number, y: number, zoom: number): string {
  return template
    .replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}
