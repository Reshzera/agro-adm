import { describe, expect, it } from 'vitest'
import {
  fitView,
  fromPixels,
  MAX_ZOOM,
  MIN_ZOOM,
  panned,
  polygonAreaHa,
  tileGrid,
  project,
  toPixels,
  unproject,
  type LngLat,
} from './geo'

const PASTO: LngLat[] = [
  [-54.111902, -19.519397],
  [-54.103268, -19.518559],
  [-54.101698, -19.524424],
  [-54.110724, -19.525542],
]

const SIZE = { width: 800, height: 600 }

describe('map geometry', () => {
  it('measures a traced paddock in hectares on the ground', () => {
    expect(polygonAreaHa(PASTO)).toBeCloseTo(63.5, 1)
  })

  it('measures nothing until the tracing closes an area', () => {
    expect(polygonAreaHa([])).toBe(0)
    expect(polygonAreaHa(PASTO.slice(0, 2))).toBe(0)
  })

  it('returns a dragged vertex to the coordinate the pointer was over', () => {
    const view = { center: PASTO[0], zoom: 15 }
    const pixel = { x: 421, y: 233 }
    const [lng, lat] = fromPixels(pixel, view, SIZE)

    expect(toPixels([lng, lat], view, SIZE).x).toBeCloseTo(pixel.x, 6)
    expect(toPixels([lng, lat], view, SIZE).y).toBeCloseTo(pixel.y, 6)
  })

  it('keeps a coordinate through the mercator round trip', () => {
    const [lng, lat] = unproject(project([-54.0933, -19.5307], 14), 14)

    expect(lng).toBeCloseTo(-54.0933, 9)
    expect(lat).toBeCloseTo(-19.5307, 9)
  })

  it('frames the paddocks it was asked to show', () => {
    const fallback = { center: [-54.0933, -19.5307] as LngLat, zoom: 13 }
    const view = fitView(PASTO, SIZE, fallback)

    expect(view.zoom).toBeGreaterThan(13)
    expect(view.zoom).toBeLessThanOrEqual(MAX_ZOOM)
    for (const point of PASTO) {
      const { x, y } = toPixels(point, view, SIZE)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(SIZE.width)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(SIZE.height)
    }
  })

  it('falls back to the farm seat when there is nothing drawn yet', () => {
    const fallback = { center: [-54.0933, -19.5307] as LngLat, zoom: 13 }

    expect(fitView([], SIZE, fallback)).toEqual(fallback)
    expect(fitView(PASTO, { width: 0, height: 0 }, fallback)).toEqual(fallback)
  })

  it('never frames tighter or wider than the tile source can serve', () => {
    const single: LngLat[] = [PASTO[0], PASTO[0], PASTO[0]]
    const world: LngLat[] = [
      [-179, -80],
      [179, -80],
      [179, 80],
    ]

    expect(fitView(single, SIZE, { center: PASTO[0], zoom: 13 }).zoom).toBe(MAX_ZOOM)
    expect(fitView(world, SIZE, { center: PASTO[0], zoom: 13 }).zoom).toBe(MIN_ZOOM)
  })

  it('covers the viewport with tiles, with the centre tile under the centre of the map', () => {
    const view = { center: PASTO[0], zoom: 15 }
    const { tilePx, tiles } = tileGrid(view, SIZE)

    expect(tiles.length).toBeGreaterThan(0)
    for (const tile of tiles) {
      expect(tile.zoom).toBe(15)
      expect(tile.x).toBeGreaterThanOrEqual(0)
      expect(tile.x).toBeLessThan(2 ** 15)
    }
    expect(Math.min(...tiles.map((tile) => tile.left))).toBeLessThanOrEqual(0)
    expect(Math.max(...tiles.map((tile) => tile.left)) + tilePx).toBeGreaterThanOrEqual(SIZE.width)
    expect(Math.max(...tiles.map((tile) => tile.top)) + tilePx).toBeGreaterThanOrEqual(SIZE.height)

    const middle = { x: SIZE.width / 2, y: SIZE.height / 2 }
    const under = tiles.find(
      (tile) =>
        middle.x >= tile.left &&
        middle.x < tile.left + tilePx &&
        middle.y >= tile.top &&
        middle.y < tile.top + tilePx,
    )!
    const projected = project(view.center, 15)
    expect(under.x).toBe(Math.floor(projected.x / 256))
    expect(under.y).toBe(Math.floor(projected.y / 256))
  })

  it('asks the tile source only for tiles that exist at a fractional zoom', () => {
    const { zoom, tilePx, tiles } = tileGrid({ center: [0, 0], zoom: 3.4 }, SIZE)

    expect(zoom).toBe(3)
    expect(tilePx).toBeCloseTo(256 * 2 ** 0.4, 6)
    for (const tile of tiles) {
      expect(tile.x).toBeLessThan(8)
      expect(tile.y).toBeLessThan(8)
    }
  })

  it('moves the map by the distance the pointer dragged', () => {
    const view = { center: PASTO[0], zoom: 15 }
    const dragged = panned(view, 120, -60)

    expect(toPixels(view.center, dragged, SIZE).x).toBeCloseTo(SIZE.width / 2 + 120, 6)
    expect(toPixels(view.center, dragged, SIZE).y).toBeCloseTo(SIZE.height / 2 - 60, 6)
  })
})
