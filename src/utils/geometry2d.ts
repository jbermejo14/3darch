import { Point2D, Wall } from '../types/architectural';

export const METERS_TO_PIXELS_DEFAULT = 60; // 60px = 1m at scale 1.0

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function snapToGrid(val: number, step: number): number {
  return Math.round(val / step) * step;
}

export function snapPointToGrid(p: Point2D, step: number): Point2D {
  return {
    x: snapToGrid(p.x, step),
    y: snapToGrid(p.y, step),
  };
}

export function snapPointToAngles(start: Point2D, current: Point2D): Point2D {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return current;

  let angle = Math.atan2(dy, dx); // radians
  const angleDeg = ((angle * 180) / Math.PI + 360) % 360;

  // Snap to multiples of 45 degrees if close (within 10 degrees)
  const snapIncrement = 45;
  const nearestAngle = Math.round(angleDeg / snapIncrement) * snapIncrement;
  const diff = Math.abs(angleDeg - nearestAngle);

  if (diff < 8 || diff > 352) {
    const rad = (nearestAngle * Math.PI) / 180;
    return {
      x: start.x + len * Math.cos(rad),
      y: start.y + len * Math.sin(rad),
    };
  }

  return current;
}

export function findNearestWallVertex(
  point: Point2D,
  walls: Wall[],
  tolerance = 0.35 // in meters
): { point: Point2D; wallId: string; isStart: boolean } | null {
  let closestDist = tolerance;
  let bestMatch: { point: Point2D; wallId: string; isStart: boolean } | null = null;

  for (const wall of walls) {
    const dStart = distance(point, wall.start);
    if (dStart < closestDist) {
      closestDist = dStart;
      bestMatch = { point: { ...wall.start }, wallId: wall.id, isStart: true };
    }

    const dEnd = distance(point, wall.end);
    if (dEnd < closestDist) {
      closestDist = dEnd;
      bestMatch = { point: { ...wall.end }, wallId: wall.id, isStart: false };
    }
  }

  return bestMatch;
}

export function distancePointToSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D
): { distance: number; projection: Point2D; ratio: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    return { distance: distance(p, a), projection: { ...a }, ratio: 0 };
  }

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  let t = (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = {
    x: a.x + t * abx,
    y: a.y + t * aby,
  };

  return {
    distance: distance(p, proj),
    projection: proj,
    ratio: t,
  };
}

export function findNearestWall(
  point: Point2D,
  walls: Wall[],
  tolerance = 0.4
): { wall: Wall; ratio: number; point: Point2D } | null {
  let closestDist = tolerance;
  let best: { wall: Wall; ratio: number; point: Point2D } | null = null;

  for (const wall of walls) {
    const { distance: d, projection, ratio } = distancePointToSegment(point, wall.start, wall.end);
    if (d < closestDist && ratio > 0.05 && ratio < 0.95) {
      closestDist = d;
      best = { wall, ratio, point: projection };
    }
  }

  return best;
}

/**
 * Calculates area of polygon in m^2 using Shoelace formula
 */
export function calculatePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Centroid of polygon for placing room label
 */
export function calculatePolygonCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length < 3) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
  }

  let cx = 0;
  let cy = 0;
  let signedArea = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const x0 = points[i].x;
    const y0 = points[i].y;
    const x1 = points[(i + 1) % n].x;
    const y1 = points[(i + 1) % n].y;
    const a = x0 * y1 - x1 * y0;
    signedArea += a;
    cx += (x0 + x1) * a;
    cy += (y0 + y1) * a;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-5) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;

  return { x: cx, y: cy };
}

/**
 * Point in polygon test (ray-casting algorithm)
 */
export function isPointInPolygon(point: Point2D, vs: Point2D[]): boolean {
  const x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;

    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Room cycle detection:
 * Given walls, find closed loops of wall endpoints.
 */
export function detectClosedRoomsFromWalls(walls: Wall[]): Point2D[][] {
  if (walls.length < 3) return [];

  // 1. Cluster endpoints that are within 0.15m to create clean graph nodes
  const nodes: Point2D[] = [];
  const findOrCreateNode = (pt: Point2D): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (distance(nodes[i], pt) < 0.15) {
        return i;
      }
    }
    nodes.push({ x: Number(pt.x.toFixed(2)), y: Number(pt.y.toFixed(2)) });
    return nodes.length - 1;
  };

  const adj = new Map<number, Set<number>>();
  for (const wall of walls) {
    const u = findOrCreateNode(wall.start);
    const v = findOrCreateNode(wall.end);
    if (u === v) continue;
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
  }

  // 2. Find simple chordless cycles / minimal cycles (length 3 to 12)
  const cycles: number[][] = [];
  const visited = new Set<string>();

  function findCycles(current: number, start: number, path: number[], maxDepth = 8) {
    if (path.length > maxDepth) return;
    const neighbors = adj.get(current);
    if (!neighbors) return;

    for (const next of neighbors) {
      if (next === start && path.length >= 3) {
        // Found cycle
        const sorted = [...path].sort((a, b) => a - b).join('-');
        if (!visited.has(sorted)) {
          visited.add(sorted);
          cycles.push([...path]);
        }
        continue;
      }

      if (!path.includes(next)) {
        findCycles(next, start, [...path, next], maxDepth);
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    findCycles(i, i, [i], 8);
  }

  // Convert cycles to points and filter reasonable areas (> 1.5 m^2 and < 400 m^2)
  const validPolygons: Point2D[][] = [];
  for (const cycle of cycles) {
    const pts = cycle.map(idx => nodes[idx]);
    const area = calculatePolygonArea(pts);
    if (area >= 1.5 && area <= 500) {
      // Check if duplicate area & centroid already exist
      const centroid = calculatePolygonCentroid(pts);
      const isDupe = validPolygons.some(poly => {
        const polyArea = calculatePolygonArea(poly);
        const polyCentroid = calculatePolygonCentroid(poly);
        return Math.abs(polyArea - area) < 0.2 && distance(polyCentroid, centroid) < 0.3;
      });

      if (!isDupe) {
        validPolygons.push(pts);
      }
    }
  }

  return validPolygons;
}
