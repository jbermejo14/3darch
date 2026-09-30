import * as THREE from 'three';
import earcut from 'earcut';
import { Room, Point2D } from '../types/architectural';
import { createProceduralFloorTexture } from '../utils/textureGenerator';

interface Floor3DResult {
  floorMesh: THREE.Mesh;
  ceilingMesh?: THREE.Mesh;
  skirtingGroup?: THREE.Group;
}

// Helper: 2D polygon signed area (Shoelace formula)
function getSignedArea(pts: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    area += pts[i].x * next.y - next.x * pts[i].y;
  }
  return area / 2;
}

// Helper: Point in polygon test (Ray casting)
function isPointInPoly(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper: Clamp a hole point inside the polygon if it sits on or outside a perimeter wall
function clampPointInsidePoly(pt: Point2D, center: Point2D, poly: Point2D[], margin = 0.04): Point2D {
  if (isPointInPoly(pt, poly)) {
    return pt;
  }
  // Binary search along line from center (inside) to pt (outside)
  let low = 0;
  let high = 1;
  for (let step = 0; step < 12; step++) {
    const mid = (low + high) / 2;
    const testPt = {
      x: center.x + (pt.x - center.x) * mid,
      y: center.y + (pt.y - center.y) * mid,
    };
    if (isPointInPoly(testPt, poly)) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const safeT = Math.max(0, low - margin);
  return {
    x: center.x + (pt.x - center.x) * safeT,
    y: center.y + (pt.y - center.y) * safeT,
  };
}

// Process holes for earcut & guardrails
interface ProcessedHoles {
  triangulationHoles: Point2D[][];
  displayHoles: Point2D[][];
}

function processHolesForRoom(holes: Point2D[][], outerPoints: Point2D[]): ProcessedHoles {
  const outerArea = getSignedArea(outerPoints);
  const triangulationHoles: Point2D[][] = [];
  const displayHoles: Point2D[][] = [];

  holes.forEach((rawHole) => {
    if (rawHole.length < 3) return;

    // Check if hole center or any vertex falls within this room
    const cx = rawHole.reduce((s, p) => s + p.x, 0) / rawHole.length;
    const cy = rawHole.reduce((s, p) => s + p.y, 0) / rawHole.length;
    const center = { x: cx, y: cy };

    const isCenterIn = isPointInPoly(center, outerPoints);
    const anyCornerIn = rawHole.some((pt) => isPointInPoly(pt, outerPoints));

    if (!isCenterIn && !anyCornerIn) return;

    // Clamp vertices so that none cross the outer polygon boundaries
    const safeHole = rawHole.map((pt) => clampPointInsidePoly(pt, center, outerPoints));

    displayHoles.push(safeHole);

    // Earcut strictly requires holes to have OPPOSITE winding direction to outer ring
    const holeArea = getSignedArea(safeHole);
    let orientedHole = [...safeHole];
    if ((outerArea > 0 && holeArea > 0) || (outerArea < 0 && holeArea < 0)) {
      orientedHole.reverse();
    }
    triangulationHoles.push(orientedHole);
  });

  return { triangulationHoles, displayHoles };
}

export function createProceduralFloor3D(
  room: Room,
  wallHeight = 2.6,
  showCeiling = false,
  isSelected = false,
  floorHoles: Point2D[][] = [],
  ceilingHoles: Point2D[][] = []
): Floor3DResult {
  const points = room.polygonPoints;
  if (points.length < 3) {
    const dummy = new THREE.Mesh();
    return { floorMesh: dummy };
  }

  // 1. Process Floor Holes
  const { triangulationHoles: floorTriHoles, displayHoles: floorDispHoles } =
    processHolesForRoom(floorHoles, points);

  // Flatten points for earcut [x0, y0, x1, y1, ...]
  // In Three.js: 2D X is 3D X, 2D Y is 3D Z
  const verticesFlat: number[] = [];
  points.forEach((p) => {
    verticesFlat.push(p.x, p.y);
  });

  const allVertices: Point2D[] = [...points];
  const holeIndices: number[] = [];

  floorTriHoles.forEach((hole) => {
    const holeIdx = allVertices.length;
    holeIndices.push(holeIdx);
    hole.forEach((hp) => {
      verticesFlat.push(hp.x, hp.y);
      allVertices.push(hp);
    });
  });

  const triangles = earcut(verticesFlat, holeIndices.length > 0 ? holeIndices : undefined);

  // Construct BufferGeometry for Floor
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i < triangles.length; i += 3) {
    const i0 = triangles[i];
    const i1 = triangles[i + 1];
    const i2 = triangles[i + 2];

    const p0 = allVertices[i0];
    const p1 = allVertices[i1];
    const p2 = allVertices[i2];
    if (!p0 || !p1 || !p2) continue;

    positions.push(p0.x, 0.005, p0.y);
    positions.push(p1.x, 0.005, p1.y);
    positions.push(p2.x, 0.005, p2.y);

    const uvScale = 1.5;
    uvs.push(p0.x / uvScale, p0.y / uvScale);
    uvs.push(p1.x / uvScale, p1.y / uvScale);
    uvs.push(p2.x / uvScale, p2.y / uvScale);

    normals.push(0, 1, 0);
    normals.push(0, 1, 0);
    normals.push(0, 1, 0);
  }

  const floorGeom = new THREE.BufferGeometry();
  floorGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  floorGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  floorGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  const floorTex = createProceduralFloorTexture(room.floorTexture, room.floorColor);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    color: isSelected ? 0x93c5fd : 0xffffff,
    roughness: 0.65,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const floorMesh = new THREE.Mesh(floorGeom, floorMat);
  floorMesh.receiveShadow = true;
  floorMesh.userData = { type: 'room', id: room.id, name: room.name };

  // Skirting board (rodapié) around outer perimeter
  const skirtingGroup = new THREE.Group();
  const skirtingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
  });
  const skirtingHeight = 0.08;
  const skirtingThick = 0.015;

  for (let i = 0; i < points.length; i++) {
    const pA = points[i];
    const pB = points[(i + 1) % points.length];
    const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
    if (segLen < 0.05) continue;

    const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
    const skirtGeom = new THREE.BoxGeometry(segLen, skirtingHeight, skirtingThick);
    const skirtMesh = new THREE.Mesh(skirtGeom, skirtingMat);
    skirtMesh.position.set((pA.x + pB.x) / 2, skirtingHeight / 2, (pA.y + pB.y) / 2);
    skirtMesh.rotation.y = -angle;
    skirtingGroup.add(skirtMesh);
  }

  // 2. Ceiling Mesh (with cutouts for ascending staircases)
  let ceilingMesh: THREE.Mesh | undefined;
  if (showCeiling || room.ceilingVisible) {
    const { triangulationHoles: ceilTriHoles } = processHolesForRoom(ceilingHoles, points);

    const ceilFlat: number[] = [];
    points.forEach((p) => ceilFlat.push(p.x, p.y));

    const allCeilVerts: Point2D[] = [...points];
    const ceilHoleIdxs: number[] = [];

    ceilTriHoles.forEach((hole) => {
      const idx = allCeilVerts.length;
      ceilHoleIdxs.push(idx);
      hole.forEach((hp) => {
        ceilFlat.push(hp.x, hp.y);
        allCeilVerts.push(hp);
      });
    });

    const ceilTriangles = earcut(ceilFlat, ceilHoleIdxs.length > 0 ? ceilHoleIdxs : undefined);

    const ceilPositions: number[] = [];
    const ceilNormals: number[] = [];

    const roomH = room.height || wallHeight;

    // Flip triangle winding for ceiling facing downward
    for (let i = 0; i < ceilTriangles.length; i += 3) {
      const p0 = allCeilVerts[ceilTriangles[i]];
      const p1 = allCeilVerts[ceilTriangles[i + 1]];
      const p2 = allCeilVerts[ceilTriangles[i + 2]];
      if (!p0 || !p1 || !p2) continue;

      ceilPositions.push(p0.x, roomH, p0.y);
      ceilPositions.push(p2.x, roomH, p2.y);
      ceilPositions.push(p1.x, roomH, p1.y);

      ceilNormals.push(0, -1, 0);
      ceilNormals.push(0, -1, 0);
      ceilNormals.push(0, -1, 0);
    }

    const ceilGeom = new THREE.BufferGeometry();
    ceilGeom.setAttribute('position', new THREE.Float32BufferAttribute(ceilPositions, 3));
    ceilGeom.setAttribute('normal', new THREE.Float32BufferAttribute(ceilNormals, 3));

    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    ceilingMesh = new THREE.Mesh(ceilGeom, ceilMat);
    ceilingMesh.castShadow = true;
  }

  return { floorMesh, ceilingMesh, skirtingGroup };
}
