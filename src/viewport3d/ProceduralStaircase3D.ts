import * as THREE from 'three';
import { Staircase } from '../types/architectural';

export function createProceduralStaircase3D(stair: Staircase, isSelected = false): THREE.Group {
  const root = new THREE.Group();
  root.name = `stair_${stair.id}`;
  root.position.set(stair.x, 0, stair.y);
  root.rotation.y = -(stair.rotation * Math.PI) / 180;
  root.userData = { type: 'stairs', id: stair.id };

  const selectColor = isSelected ? 0x60a5fa : null;

  // Materials
  const woodTreadMat = new THREE.MeshStandardMaterial({
    color: selectColor || 0xc89d66,
    roughness: 0.5,
    metalness: 0.05,
  });

  const steelStructureMat = new THREE.MeshStandardMaterial({
    color: selectColor || 0x1e293b,
    roughness: 0.35,
    metalness: 0.8,
  });

  const { width: w, length: l, height: h, stepCount = 14 } = stair;

  if (stair.type === 'straight') {
    const stepDepth = l / stepCount;
    const stepRise = h / stepCount;
    const treadThick = 0.04;

    // 1. Treads & Risers
    // In architectural convention & 2D canvas, staircase starts at +l/2 (bottom) and ascends to -l/2 (top landing)
    for (let i = 0; i < stepCount; i++) {
      const stepY = (i + 1) * stepRise;
      const stepZ = l / 2 - (i + 0.5) * stepDepth;

      // Wooden Tread
      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(w, treadThick, stepDepth + 0.025),
        woodTreadMat
      );
      tread.position.set(0, stepY - treadThick / 2, stepZ);
      tread.castShadow = true;
      tread.receiveShadow = true;
      root.add(tread);

      // Steel Riser plate
      const riser = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.04, stepRise, 0.02),
        steelStructureMat
      );
      riser.position.set(0, stepY - stepRise / 2, stepZ + stepDepth / 2 - 0.01);
      riser.castShadow = true;
      root.add(riser);
    }

    // 2. Lateral Steel Stringers (Limones laterales)
    const stringerThick = 0.04;
    const stringerHeight = 0.18;
    const stringerLen = Math.hypot(l, h);
    // Positive angle: in Three.js, box rotation.x = +atan2(h,l) rises in Y as Z decreases towards -l/2
    const stringerAngle = Math.atan2(h, l);

    const stringerGeom = new THREE.BoxGeometry(stringerThick, stringerHeight, stringerLen);

    const leftStr = new THREE.Mesh(stringerGeom, steelStructureMat);
    leftStr.position.set(-w / 2 + stringerThick / 2, h / 2, 0);
    leftStr.rotation.x = stringerAngle;
    leftStr.castShadow = true;

    const rightStr = new THREE.Mesh(stringerGeom, steelStructureMat);
    rightStr.position.set(w / 2 - stringerThick / 2, h / 2, 0);
    rightStr.rotation.x = stringerAngle;
    rightStr.castShadow = true;

    root.add(leftStr, rightStr);
  } else if (stair.type === 'spiral') {
    // Spiral Staircase (Escalera de Caracol)
    const centralColRadius = 0.1;
    const centralCol = new THREE.Mesh(
      new THREE.CylinderGeometry(centralColRadius, centralColRadius, h, 16),
      steelStructureMat
    );
    centralCol.position.set(0, h / 2, 0);
    centralCol.castShadow = true;
    root.add(centralCol);

    const stepRise = h / stepCount;
    const treadAngle = (Math.PI * 1.8) / stepCount; // 324 degrees total rotation

    for (let i = 0; i < stepCount; i++) {
      const curAngle = i * treadAngle;
      const curY = (i + 1) * stepRise;

      const stepGroup = new THREE.Group();
      stepGroup.position.set(0, curY, 0);
      stepGroup.rotation.y = curAngle;

      // Fan-shaped tread
      const treadRadius = w;
      const treadGeom = new THREE.CylinderGeometry(
        treadRadius,
        treadRadius,
        0.04,
        8,
        1,
        false,
        -treadAngle / 2,
        treadAngle
      );
      const treadMesh = new THREE.Mesh(treadGeom, woodTreadMat);
      treadMesh.position.set(0, -0.02, 0);
      treadMesh.castShadow = true;
      stepGroup.add(treadMesh);

      root.add(stepGroup);
    }
  } else {
    // L-Shaped Staircase with intermediate landing
    const halfCount = Math.floor(stepCount / 2);
    const stepRise = h / stepCount;
    const landingH = halfCount * stepRise;
    const stepDepth = (l * 0.6) / halfCount;
    const treadThick = 0.04;

    // Flight 1: Straight up to landing
    for (let i = 0; i < halfCount; i++) {
      const stepY = (i + 1) * stepRise;
      const stepZ = -l / 2 + i * stepDepth + stepDepth / 2;

      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(w, treadThick, stepDepth),
        woodTreadMat
      );
      tread.position.set(0, stepY - treadThick / 2, stepZ);
      tread.castShadow = true;
      root.add(tread);
    }

    // Landing Platform (Square)
    const landing = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.5, treadThick, w * 1.5),
      woodTreadMat
    );
    landing.position.set(w * 0.25, landingH - treadThick / 2, -l / 2 + halfCount * stepDepth + w * 0.75);
    landing.castShadow = true;
    root.add(landing);

    // Flight 2: Turned 90 degrees
    const remainingSteps = stepCount - halfCount;
    for (let j = 0; j < remainingSteps; j++) {
      const stepY = landingH + (j + 1) * stepRise;
      const stepX = w * 0.25 + (j + 1) * (w / 2);

      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(stepDepth, treadThick, w),
        woodTreadMat
      );
      tread.position.set(stepX, stepY - treadThick / 2, -l / 2 + halfCount * stepDepth + w * 0.75);
      tread.castShadow = true;
      root.add(tread);
    }
  }

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData = { type: 'stairs', id: stair.id };
    }
  });

  return root;
}
