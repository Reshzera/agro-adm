import type { Prisma } from '@prisma/client';

export const BOUNDARY_VERSION = 1;
export const AREA_DIVERGENCE_THRESHOLD_PERCENT = 20;

const EARTH_RADIUS_M = 6_378_137;
const SQUARE_METERS_PER_HECTARE = 10_000;

export type BoundarySpace = 'geo' | 'image';

export type BoundaryPoint = [number, number];

export type PaddockBoundary = {
  space: BoundarySpace;
  version: number;
  points: BoundaryPoint[];
};

export type PresentedBoundary = PaddockBoundary & {
  computedAreaHa: string | null;
};

export type AreaDivergence = {
  computedAreaHa: string;
  usableAreaHa: string;
  differencePercent: number;
  significant: boolean;
};

function isPoint(value: unknown): value is BoundaryPoint {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (coordinate) =>
        typeof coordinate === 'number' && Number.isFinite(coordinate),
    )
  );
}

export function readBoundary(
  value: Prisma.JsonValue | null | undefined,
): PaddockBoundary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.points)) return null;
  const points = record.points.filter(isPoint);
  if (points.length !== record.points.length || points.length < 3) return null;
  return {
    space: record.space === 'geo' ? 'geo' : 'image',
    version:
      typeof record.version === 'number' ? record.version : BOUNDARY_VERSION,
    points,
  };
}

export function storeBoundary(points: BoundaryPoint[]): Prisma.InputJsonValue {
  return { space: 'geo', version: BOUNDARY_VERSION, points };
}

export function geodesicAreaHa(boundary: PaddockBoundary): number | null {
  if (boundary.space !== 'geo') return null;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  let ring = 0;
  for (let index = 0; index < boundary.points.length; index += 1) {
    const [fromLng, fromLat] = boundary.points[index];
    const [toLng, toLat] =
      boundary.points[(index + 1) % boundary.points.length];
    ring +=
      radians(toLng - fromLng) *
      (2 + Math.sin(radians(fromLat)) + Math.sin(radians(toLat)));
  }
  const squareMeters = Math.abs((ring * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
  return squareMeters / SQUARE_METERS_PER_HECTARE;
}

export function presentBoundary(
  value: Prisma.JsonValue | null | undefined,
): PresentedBoundary | null {
  const boundary = readBoundary(value);
  if (!boundary) return null;
  const computed = geodesicAreaHa(boundary);
  return {
    ...boundary,
    computedAreaHa: computed === null ? null : computed.toFixed(2),
  };
}

export function areaDivergence(
  computedAreaHa: string | null,
  usableAreaHa: string | null,
): AreaDivergence | null {
  if (computedAreaHa === null || usableAreaHa === null) return null;
  const computed = Number(computedAreaHa);
  const usable = Number(usableAreaHa);
  if (!Number.isFinite(computed) || !Number.isFinite(usable) || usable <= 0) {
    return null;
  }
  const differencePercent = ((computed - usable) / usable) * 100;
  return {
    computedAreaHa,
    usableAreaHa,
    differencePercent: Number(differencePercent.toFixed(1)),
    significant:
      Math.abs(differencePercent) >= AREA_DIVERGENCE_THRESHOLD_PERCENT,
  };
}
