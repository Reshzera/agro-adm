export type LngLat = [number, number]

export type Bounds = { west: number; south: number; east: number; north: number }

export type MapView = { center: LngLat; zoom: number }

export type Size = { width: number; height: number }

export const TILE_SIZE = 256
export const MIN_ZOOM = 3
export const MAX_ZOOM = 19

const EARTH_RADIUS_M = 6_378_137
const SQUARE_METERS_PER_HECTARE = 10_000
const MAX_LATITUDE = 85.05112878

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function project([lng, lat]: LngLat, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom
  const clamped = Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, lat))
  const sin = Math.sin(radians(clamped))
  return {
    x: scale * (lng / 360 + 0.5),
    y: scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)),
  }
}

export function unproject({ x, y }: { x: number; y: number }, zoom: number): LngLat {
  const scale = TILE_SIZE * 2 ** zoom
  const lng = (x / scale - 0.5) * 360
  const lat = 90 - (360 * Math.atan(Math.exp((y / scale - 0.5) * 2 * Math.PI))) / Math.PI
  return [lng, lat]
}

export function polygonAreaHa(points: LngLat[]): number {
  if (points.length < 3) return 0
  let ring = 0
  for (let index = 0; index < points.length; index += 1) {
    const [fromLng, fromLat] = points[index]
    const [toLng, toLat] = points[(index + 1) % points.length]
    ring += radians(toLng - fromLng) * (2 + Math.sin(radians(fromLat)) + Math.sin(radians(toLat)))
  }
  const squareMeters = Math.abs((ring * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
  return squareMeters / SQUARE_METERS_PER_HECTARE
}

export function boundsOf(points: LngLat[]): Bounds | null {
  if (points.length === 0) return null
  return points.reduce<Bounds>(
    (bounds, [lng, lat]) => ({
      west: Math.min(bounds.west, lng),
      south: Math.min(bounds.south, lat),
      east: Math.max(bounds.east, lng),
      north: Math.max(bounds.north, lat),
    }),
    { west: points[0][0], south: points[0][1], east: points[0][0], north: points[0][1] },
  )
}

export function centerOf(bounds: Bounds): LngLat {
  const northWest = project([bounds.west, bounds.north], MAX_ZOOM)
  const southEast = project([bounds.east, bounds.south], MAX_ZOOM)
  return unproject(
    { x: (northWest.x + southEast.x) / 2, y: (northWest.y + southEast.y) / 2 },
    MAX_ZOOM,
  )
}

export function fitView(points: LngLat[], size: Size, fallback: MapView): MapView {
  const bounds = boundsOf(points)
  if (!bounds || size.width === 0 || size.height === 0) return fallback

  const northWest = project([bounds.west, bounds.north], MIN_ZOOM)
  const southEast = project([bounds.east, bounds.south], MIN_ZOOM)
  const width = Math.max(southEast.x - northWest.x, 1e-6)
  const height = Math.max(southEast.y - northWest.y, 1e-6)
  const padding = 0.8
  const zoom =
    MIN_ZOOM +
    Math.log2(Math.min((size.width * padding) / width, (size.height * padding) / height))

  return { center: centerOf(bounds), zoom: clampZoom(Math.floor(zoom * 100) / 100) }
}

export function toPixels(point: LngLat, view: MapView, size: Size): { x: number; y: number } {
  const origin = project(view.center, view.zoom)
  const projected = project(point, view.zoom)
  return {
    x: projected.x - origin.x + size.width / 2,
    y: projected.y - origin.y + size.height / 2,
  }
}

export function fromPixels(
  pixel: { x: number; y: number },
  view: MapView,
  size: Size,
): LngLat {
  const origin = project(view.center, view.zoom)
  return unproject(
    { x: origin.x + pixel.x - size.width / 2, y: origin.y + pixel.y - size.height / 2 },
    view.zoom,
  )
}

export function panned(view: MapView, deltaX: number, deltaY: number): MapView {
  const origin = project(view.center, view.zoom)
  return {
    ...view,
    center: unproject({ x: origin.x - deltaX, y: origin.y - deltaY }, view.zoom),
  }
}

export type Tile = { key: string; x: number; y: number; zoom: number; left: number; top: number }

export type TileGrid = { zoom: number; tilePx: number; tiles: Tile[] }

export function tileGrid(view: MapView, size: Size): TileGrid {
  const zoom = clampZoom(Math.round(view.zoom))
  const scale = 2 ** (view.zoom - zoom)
  const tilePx = TILE_SIZE * scale
  const origin = project(view.center, zoom)
  const topLeft = {
    x: origin.x - size.width / 2 / scale,
    y: origin.y - size.height / 2 / scale,
  }
  const first = {
    x: Math.floor(topLeft.x / TILE_SIZE),
    y: Math.floor(topLeft.y / TILE_SIZE),
  }
  const limit = 2 ** zoom
  const tiles: Tile[] = []

  for (let row = 0; row <= Math.ceil(size.height / tilePx); row += 1) {
    for (let column = 0; column <= Math.ceil(size.width / tilePx); column += 1) {
      const x = first.x + column
      const y = first.y + row
      if (x < 0 || y < 0 || x >= limit || y >= limit) continue
      tiles.push({
        key: `${zoom}/${x}/${y}`,
        x,
        y,
        zoom,
        left: (x * TILE_SIZE - topLeft.x) * scale,
        top: (y * TILE_SIZE - topLeft.y) * scale,
      })
    }
  }

  return { zoom, tilePx, tiles }
}
