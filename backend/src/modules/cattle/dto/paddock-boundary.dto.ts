import {
  IsIn,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import type { BoundaryPoint } from '../boundary/paddock-boundary';

const MIN_VERTICES = 3;
const MAX_VERTICES = 500;
const MAX_MAPPED_LATITUDE = 85;

@ValidatorConstraint({ name: 'geoRing' })
export class GeoRingConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!Array.isArray(value)) return false;
    if (value.length < MIN_VERTICES || value.length > MAX_VERTICES)
      return false;
    return value.every((point: unknown) => {
      if (!Array.isArray(point) || point.length !== 2) return false;
      const [longitude, latitude] = point as unknown[];
      return (
        typeof longitude === 'number' &&
        typeof latitude === 'number' &&
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        Math.abs(longitude) <= 180 &&
        Math.abs(latitude) <= MAX_MAPPED_LATITUDE
      );
    });
  }

  defaultMessage(): string {
    return `points must be ${MIN_VERTICES} to ${MAX_VERTICES} [longitude, latitude] pairs within the mapped world`;
  }
}

export class PaddockBoundaryDto {
  @IsIn(['geo'])
  space!: 'geo';

  @Validate(GeoRingConstraint)
  points!: BoundaryPoint[];
}
