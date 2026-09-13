import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  clampZoom,
  fitView,
  fromPixels,
  panned,
  tileGrid,
  toPixels,
  type LngLat,
  type MapView,
  type Size,
} from '../../../map/geo'
import { satelliteCredit, satelliteTileUrl } from '../../../map/tiles'
import styles from './farm-map.module.scss'

export type MapPolygon = {
  id: string
  name: string
  points: LngLat[]
  occupied?: boolean
}

type Draft = {
  points: LngLat[]
  onChange(points: LngLat[]): void
}

type FarmMapProps = {
  polygons: MapPolygon[]
  home: LngLat
  label: string
  focusIds?: string[]
  draft?: Draft
  onSelect?(id: string): void
}

const VERTEX_HIT_PX = 16
const CLICK_SLOP_PX = 4

type Pointer = { x: number; y: number; moved: boolean; vertex: number | null }

function centroid(pixels: { x: number; y: number }[]): { x: number; y: number } {
  return {
    x: pixels.reduce((sum, point) => sum + point.x, 0) / pixels.length,
    y: pixels.reduce((sum, point) => sum + point.y, 0) / pixels.length,
  }
}

function contains(pixels: { x: number; y: number }[], point: { x: number; y: number }): boolean {
  let inside = false
  for (let i = 0, j = pixels.length - 1; i < pixels.length; j = i, i += 1) {
    const crosses = pixels[i].y > point.y !== pixels[j].y > point.y
    const at =
      ((pixels[j].x - pixels[i].x) * (point.y - pixels[i].y)) / (pixels[j].y - pixels[i].y) +
      pixels[i].x
    if (crosses && point.x < at) inside = !inside
  }
  return inside
}

function useMeasuredSize(target: React.RefObject<HTMLDivElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = target.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [target])

  return size
}

function Tiles({ view, size }: { view: MapView; size: Size }) {
  const { tilePx, tiles } = tileGrid(view, size)

  return (
    <div className={styles.tiles}>
      {tiles.map((tile) => (
        <img
          key={tile.key}
          className={styles.tile}
          src={satelliteTileUrl(tile.x, tile.y, tile.zoom)}
          alt=""
          draggable={false}
          style={{
            width: tilePx,
            height: tilePx,
            transform: `translate(${tile.left}px, ${tile.top}px)`,
          }}
        />
      ))}
    </div>
  )
}

export function FarmMap({ polygons, home, label, focusIds, draft, onSelect }: FarmMapProps) {
  const surface = useRef<HTMLDivElement>(null)
  const size = useMeasuredSize(surface)
  const [view, setView] = useState<MapView>({ center: home, zoom: 13 })
  const pointer = useRef<Pointer | null>(null)

  const framed = (focusIds?.length
    ? polygons.filter((polygon) => focusIds.includes(polygon.id))
    : polygons
  ).flatMap((polygon) => polygon.points)
  const frameKey = `${size.width}x${size.height}:${framed.flat().join(',')}:${home.join(',')}`
  const lastFrame = useRef<string | null>(null)

  useEffect(() => {
    if (lastFrame.current === frameKey || size.width === 0) return
    lastFrame.current = frameKey
    setView(fitView(framed, size, { center: home, zoom: 13 }))
  }, [frameKey, framed, home, size])

  const zoomBy = useCallback(
    (delta: number, at?: { x: number; y: number }) => {
      setView((current) => {
        const zoom = clampZoom(current.zoom + delta)
        if (!at || size.width === 0) return { ...current, zoom }
        const anchor = fromPixels(at, current, size)
        const next = { ...current, zoom }
        const moved = toPixels(anchor, next, size)
        return panned(next, at.x - moved.x, at.y - moved.y)
      })
    },
    [size],
  )

  useEffect(() => {
    const element = surface.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      zoomBy(event.deltaY > 0 ? -0.4 : 0.4, {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      })
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  const localPoint = (event: React.PointerEvent): { x: number; y: number } => {
    const box = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  const vertexAt = (point: { x: number; y: number }): number | null => {
    if (!draft) return null
    const distances = draft.points.map((vertex) => {
      const pixel = toPixels(vertex, view, size)
      return Math.hypot(pixel.x - point.x, pixel.y - point.y)
    })
    const nearest = distances.indexOf(Math.min(...distances))
    return nearest >= 0 && distances[nearest] <= VERTEX_HIT_PX ? nearest : null
  }

  const onPointerDown = (event: React.PointerEvent) => {
    const point = localPoint(event)
    const vertex = vertexAt(point)
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = { ...point, moved: false, vertex }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const active = pointer.current
    if (!active) return
    const point = localPoint(event)
    const deltaX = point.x - active.x
    const deltaY = point.y - active.y
    if (Math.hypot(deltaX, deltaY) > CLICK_SLOP_PX) active.moved = true

    if (draft && active.vertex !== null) {
      const dragged = fromPixels(point, view, size)
      draft.onChange(
        draft.points.map((vertex, index) => (index === active.vertex ? dragged : vertex)),
      )
    } else {
      setView((current) => panned(current, deltaX, deltaY))
    }
    pointer.current = { ...active, x: point.x, y: point.y }
  }

  const onPointerUp = (event: React.PointerEvent) => {
    const active = pointer.current
    pointer.current = null
    if (!active || active.moved) return
    const point = localPoint(event)
    if (draft) {
      draft.onChange(
        active.vertex === null
          ? [...draft.points, fromPixels(point, view, size)]
          : draft.points.filter((_, index) => index !== active.vertex),
      )
      return
    }
    if (onSelect) {
      const hit = polygons.find((polygon) =>
        contains(
          polygon.points.map((vertex) => toPixels(vertex, view, size)),
          point,
        ),
      )
      if (hit) onSelect(hit.id)
    }
  }

  const draftPixels = draft?.points.map((vertex) => toPixels(vertex, view, size)) ?? []

  return (
    <div className={styles.map}>
      <div
        ref={surface}
        className={styles.surface}
        data-drawing={draft ? true : undefined}
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointer.current = null)}
      >
        <Tiles view={view} size={size} />
        <svg className={styles.overlay} width={size.width} height={size.height}>
          {polygons.map((polygon) => {
            const pixels = polygon.points.map((vertex) => toPixels(vertex, view, size))
            if (pixels.length < 3) return null
            const middle = centroid(pixels)
            return (
              <g
                key={polygon.id}
                className={styles.shape}
                data-occupied={polygon.occupied || undefined}
                data-framed={focusIds?.includes(polygon.id) || undefined}
              >
                <polygon points={pixels.map((pixel) => `${pixel.x},${pixel.y}`).join(' ')} />
                <text x={middle.x} y={middle.y}>
                  {polygon.name}
                </text>
              </g>
            )
          })}
          {draftPixels.length > 0 && (
            <g className={styles.draft}>
              <polygon points={draftPixels.map((pixel) => `${pixel.x},${pixel.y}`).join(' ')} />
              {draftPixels.map((pixel, index) => (
                <circle key={index} cx={pixel.x} cy={pixel.y} r={6} />
              ))}
            </g>
          )}
        </svg>
      </div>
      <div className={styles.zoom}>
        <button type="button" onClick={() => zoomBy(1)} aria-label="Aproximar">
          +
        </button>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="Afastar">
          −
        </button>
      </div>
      <small className={styles.credit}>{satelliteCredit}</small>
    </div>
  )
}
