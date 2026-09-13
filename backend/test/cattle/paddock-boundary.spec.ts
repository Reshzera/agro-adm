import {
  areaDivergence,
  geodesicAreaHa,
  presentBoundary,
  readBoundary,
} from '../../src/modules/cattle/boundary/paddock-boundary';

const SQUARE_KM = [
  [-54.05, -19.52],
  [-54.04, -19.52],
  [-54.04, -19.53],
  [-54.05, -19.53],
] as [number, number][];

describe('paddock boundary', () => {
  it('measures a geo ring in hectares against its real size on the ground', () => {
    const area = geodesicAreaHa({
      space: 'geo',
      version: 1,
      points: SQUARE_KM,
    });

    expect(area).toBeCloseTo(116.8, 1);
  });

  it('measures the same ring the same way whichever direction it was drawn in', () => {
    const clockwise = geodesicAreaHa({
      space: 'geo',
      version: 1,
      points: [...SQUARE_KM].reverse(),
    });

    expect(clockwise).toBeCloseTo(
      geodesicAreaHa({ space: 'geo', version: 1, points: SQUARE_KM })!,
      6,
    );
  });

  it('still reads a shape drawn over an uploaded image, without giving it a real area', () => {
    const legacy = presentBoundary({
      space: 'image',
      version: 1,
      points: [
        [0.12, 0.18],
        [0.34, 0.15],
        [0.38, 0.36],
      ],
    });

    expect(legacy).toEqual(
      expect.objectContaining({ space: 'image', computedAreaHa: null }),
    );
  });

  it('reads a shape that never said which space it was drawn in as image-relative', () => {
    expect(
      readBoundary({
        points: [
          [0.1, 0.1],
          [0.2, 0.1],
          [0.2, 0.2],
        ],
      })?.space,
    ).toBe('image');
  });

  it('refuses a stored shape it cannot read instead of throwing at load time', () => {
    expect(readBoundary(null)).toBeNull();
    expect(readBoundary({ space: 'geo', points: 'nada' })).toBeNull();
    expect(readBoundary({ space: 'geo', points: [[1, 2]] })).toBeNull();
    expect(
      readBoundary({
        space: 'geo',
        points: [
          [1, 2],
          ['x', 2],
          [3, 4],
        ],
      }),
    ).toBeNull();
  });

  it('calls out a wide gap between the traced area and the area the producer uses', () => {
    expect(areaDivergence('63.50', '58.00')).toEqual({
      computedAreaHa: '63.50',
      usableAreaHa: '58.00',
      differencePercent: 9.5,
      significant: false,
    });
    expect(areaDivergence('90.00', '58.00')).toEqual(
      expect.objectContaining({ differencePercent: 55.2, significant: true }),
    );
  });

  it('says nothing when one of the two figures is missing', () => {
    expect(areaDivergence(null, '58.00')).toBeNull();
    expect(areaDivergence('63.50', null)).toBeNull();
    expect(areaDivergence('63.50', '0')).toBeNull();
  });
});
