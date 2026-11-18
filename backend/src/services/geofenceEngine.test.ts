import { describe, expect, it } from 'vitest';
import { haversineMeters, isInsideGeofence, pointInPolygon } from './geofenceEngine.js';

describe('geofenceEngine geometry', () => {
  it('computes haversine distance for nearby points', () => {
    const d = haversineMeters(24.7136, 46.6753, 24.7146, 46.6753);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it('detects circle membership', () => {
    const fence = {
      type: 'circle',
      center: { lat: 24.7136, lng: 46.6753 },
      radiusMeters: 500,
    };
    expect(isInsideGeofence(24.7136, 46.6753, fence)).toBe(true);
    expect(isInsideGeofence(24.8, 46.8, fence)).toBe(false);
  });

  it('detects polygon membership with GeoJSON [lng,lat] ring', () => {
    const ring = [
      [46.67, 24.71],
      [46.68, 24.71],
      [46.68, 24.72],
      [46.67, 24.72],
      [46.67, 24.71],
    ];
    expect(pointInPolygon(46.675, 24.715, ring)).toBe(true);
    expect(pointInPolygon(46.69, 24.715, ring)).toBe(false);
    expect(
      isInsideGeofence(24.715, 46.675, {
        type: 'polygon',
        coordinates: ring,
      }),
    ).toBe(true);
  });

  it('treats rectangle the same as polygon ring', () => {
    const ring = [
      [46.67, 24.71],
      [46.69, 24.71],
      [46.69, 24.73],
      [46.67, 24.73],
      [46.67, 24.71],
    ];
    expect(
      isInsideGeofence(24.72, 46.68, {
        type: 'rectangle',
        coordinates: ring,
      }),
    ).toBe(true);
  });

  it('rejects invalid coordinates', () => {
    expect(
      isInsideGeofence(Number.NaN, 46.67, {
        type: 'circle',
        center: { lat: 24.71, lng: 46.67 },
        radiusMeters: 100,
      }),
    ).toBe(false);
  });
});
