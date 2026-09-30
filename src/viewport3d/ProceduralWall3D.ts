import * as THREE from 'three';
import { Wall, Opening } from '../types/architectural';
import { distance } from '../utils/geometry2d';
import { createProceduralWallTexture } from '../utils/textureGenerator';

interface Wall3DResult {
  group: THREE.Group;
  meshes: THREE.Mesh[];
}

export function createProceduralWall3D(
  wall: Wall,
  openings: Opening[] = [],
  isSelected = false,
  wallDisplayMode: 'full' | 'low' | 'hidden' = 'full'
): Wall3DResult {
  const group = new THREE.Group();
  group.name = `wall_${wall.id}`;
  const meshes: THREE.Mesh[] = [];

  // If walls are hidden, return empty group immediately
  if (wallDisplayMode === 'hidden') {
    return { group, meshes };
  }

  const wallLen = distance(wall.start, wall.end);
  if (wallLen < 0.05) return { group, meshes };

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const angle = Math.atan2(dy, dx);

  // Position group at start point and rotate to wall orientation
  group.position.set(wall.start.x, 0, wall.start.y);
  group.rotation.y = -angle; // Three.js Y is up, Z is 2D Y

  // Height determined by full or low (cutaway 0.85m) mode
  const effectiveHeight = wallDisplayMode === 'low' ? Math.min(wall.height, 0.85) : wall.height;

  const wallTexture = createProceduralWallTexture(wall.color || '#f8fafc');
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: isSelected ? 0x60a5fa : 0xf1f5f9,
    map: wallTexture,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.6,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.85,
    ior: 1.5,
  });

  const doorWoodMaterial = new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.6,
    metalness: 0.1,
  });

  // Sort openings along wall by distance
  const sortedOpenings = [...openings]
    .filter((op) => op.wallId === wall.id)
    .sort((a, b) => a.distanceRatio - b.distanceRatio);

  if (sortedOpenings.length === 0) {
    // Solid Wall
    const geom = new THREE.BoxGeometry(wallLen, effectiveHeight, wall.thickness);
    const mesh = new THREE.Mesh(geom, wallMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(wallLen / 2, effectiveHeight / 2, 0);
    mesh.userData = { type: 'wall', id: wall.id };
    group.add(mesh);
    meshes.push(mesh);
  } else {
    // Segmented Wall with Cutouts
    let currentX = 0;

    sortedOpenings.forEach((op) => {
      const opCenterX = op.distanceRatio * wallLen;
      const opHalfW = op.width / 2;
      const opStartX = Math.max(0, opCenterX - opHalfW);
      const opEndX = Math.min(wallLen, opCenterX + opHalfW);
      const actualOpW = opEndX - opStartX;

      // 1. Wall section before opening
      const segmentLen = opStartX - currentX;
      if (segmentLen > 0.02) {
        const segGeom = new THREE.BoxGeometry(segmentLen, effectiveHeight, wall.thickness);
        const segMesh = new THREE.Mesh(segGeom, wallMaterial);
        segMesh.castShadow = true;
        segMesh.receiveShadow = true;
        segMesh.position.set(currentX + segmentLen / 2, effectiveHeight / 2, 0);
        segMesh.userData = { type: 'wall', id: wall.id };
        group.add(segMesh);
        meshes.push(segMesh);
      }

      // 2. Wall section above opening (lintel) - only if wall is tall enough
      const topStart = op.elevation + op.height;
      const topHeight = Math.max(0, effectiveHeight - topStart);
      if (topHeight > 0.02) {
        const topGeom = new THREE.BoxGeometry(actualOpW, topHeight, wall.thickness);
        const topMesh = new THREE.Mesh(topGeom, wallMaterial);
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        topMesh.position.set(opStartX + actualOpW / 2, topStart + topHeight / 2, 0);
        topMesh.userData = { type: 'wall', id: wall.id };
        group.add(topMesh);
        meshes.push(topMesh);
      }

      // 3. Wall section below opening (window sill)
      const sillH = Math.min(op.elevation, effectiveHeight);
      if (sillH > 0.02) {
        const sillGeom = new THREE.BoxGeometry(actualOpW, sillH, wall.thickness);
        const sillMesh = new THREE.Mesh(sillGeom, wallMaterial);
        sillMesh.castShadow = true;
        sillMesh.receiveShadow = true;
        sillMesh.position.set(opStartX + actualOpW / 2, sillH / 2, 0);
        sillMesh.userData = { type: 'wall', id: wall.id };
        group.add(sillMesh);
        meshes.push(sillMesh);
      }

      // 4. Opening details (Frame, Door leaf or Window glass)
      // Only render tall frames/glass if in full wall mode
      if (wallDisplayMode === 'full') {
        const opGroup = new THREE.Group();
        opGroup.position.set(opStartX + actualOpW / 2, op.elevation, 0);
        opGroup.userData = { type: 'opening', id: op.id };

        if (op.type === 'door') {
          // Door Frame
          const frameThick = 0.04;
          const frameDepth = wall.thickness + 0.02;

          // Top frame
          const topF = new THREE.Mesh(new THREE.BoxGeometry(actualOpW, frameThick, frameDepth), frameMaterial);
          topF.position.set(0, op.height - frameThick / 2, 0);
          opGroup.add(topF);

          // Side frames
          const sideF1 = new THREE.Mesh(new THREE.BoxGeometry(frameThick, op.height, frameDepth), frameMaterial);
          sideF1.position.set(-actualOpW / 2 + frameThick / 2, op.height / 2, 0);
          const sideF2 = new THREE.Mesh(new THREE.BoxGeometry(frameThick, op.height, frameDepth), frameMaterial);
          sideF2.position.set(actualOpW / 2 - frameThick / 2, op.height / 2, 0);
          opGroup.add(sideF1, sideF2);

          // Door Leaf (slightly ajar at 25 degrees)
          const doorLeafGroup = new THREE.Group();
          doorLeafGroup.position.set(-actualOpW / 2 + frameThick, 0, 0);
          doorLeafGroup.rotation.y = -0.4; // ajar

          const leafW = actualOpW - frameThick * 2;
          const leafH = op.height - frameThick;
          const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, 0.04), doorWoodMaterial);
          doorLeaf.position.set(leafW / 2, leafH / 2, 0);
          doorLeaf.castShadow = true;
          doorLeafGroup.add(doorLeaf);

          // Door Handle
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12), frameMaterial);
          handle.rotation.z = Math.PI / 2;
          handle.position.set(leafW - 0.08, leafH / 2, 0.04);
          doorLeafGroup.add(handle);

          opGroup.add(doorLeafGroup);
        } else {
          // Window Frame & Glass
          const frameThick = 0.05;
          const frameDepth = wall.thickness + 0.02;

          // Outer frame border
          const wFrameTop = new THREE.Mesh(new THREE.BoxGeometry(actualOpW, frameThick, frameDepth), frameMaterial);
          wFrameTop.position.set(0, op.height - frameThick / 2, 0);
          const wFrameBot = new THREE.Mesh(new THREE.BoxGeometry(actualOpW, frameThick, frameDepth), frameMaterial);
          wFrameBot.position.set(0, frameThick / 2, 0);
          const wFrameL = new THREE.Mesh(new THREE.BoxGeometry(frameThick, op.height, frameDepth), frameMaterial);
          wFrameL.position.set(-actualOpW / 2 + frameThick / 2, op.height / 2, 0);
          const wFrameR = new THREE.Mesh(new THREE.BoxGeometry(frameThick, op.height, frameDepth), frameMaterial);
          wFrameR.position.set(actualOpW / 2 - frameThick / 2, op.height / 2, 0);

          opGroup.add(wFrameTop, wFrameBot, wFrameL, wFrameR);

          // Glass Pane
          const glass = new THREE.Mesh(
            new THREE.BoxGeometry(actualOpW - frameThick * 2, op.height - frameThick * 2, 0.015),
            glassMaterial
          );
          glass.position.set(0, op.height / 2, 0);
          opGroup.add(glass);
        }

        group.add(opGroup);
      } else if (wallDisplayMode === 'low' && op.type === 'door') {
        // In cutaway low mode, render a subtle door threshold
        const threshold = new THREE.Mesh(
          new THREE.BoxGeometry(actualOpW, 0.03, wall.thickness + 0.02),
          frameMaterial
        );
        threshold.position.set(opStartX + actualOpW / 2, 0.015, 0);
        group.add(threshold);
      }

      currentX = opEndX;
    });

    // Final wall section after last opening
    const finalSegment = wallLen - currentX;
    if (finalSegment > 0.02) {
      const finalGeom = new THREE.BoxGeometry(finalSegment, effectiveHeight, wall.thickness);
      const finalMesh = new THREE.Mesh(finalGeom, wallMaterial);
      finalMesh.castShadow = true;
      finalMesh.receiveShadow = true;
      finalMesh.position.set(currentX + finalSegment / 2, effectiveHeight / 2, 0);
      finalMesh.userData = { type: 'wall', id: wall.id };
      group.add(finalMesh);
      meshes.push(finalMesh);
    }
  }

  return { group, meshes };
}
