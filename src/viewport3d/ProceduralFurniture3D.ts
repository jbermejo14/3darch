import * as THREE from 'three';
import { FurnitureItem } from '../types/architectural';

export function createProceduralFurniture3D(item: FurnitureItem, isSelected = false): THREE.Group {
  const root = new THREE.Group();
  root.name = `furniture_${item.id}`;
  root.position.set(item.x, 0, item.y);
  root.rotation.y = -(item.rotation * Math.PI) / 180;
  root.userData = { type: 'furniture', id: item.id };

  const selectColor = isSelected ? 0x60a5fa : null;

  // Materials
  const woodMat = new THREE.MeshStandardMaterial({
    color: selectColor || 0xb45309,
    roughness: 0.6,
  });
  const fabricMat = new THREE.MeshStandardMaterial({
    color: selectColor || (item.color ? parseInt(item.color.replace('#', '0x')) : 0x334155),
    roughness: 0.85,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: selectColor || 0xffffff,
    roughness: 0.3,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: selectColor || 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: selectColor || 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.15,
  });
  const plantMat = new THREE.MeshStandardMaterial({
    color: selectColor || 0x15803d,
    roughness: 0.6,
  });

  const { width: w, depth: d, height: h } = item;

  switch (item.catalogId) {
    case 'sofa_modern':
    case 'armchair_lounge': {
      // Base seat
      const seatH = h * 0.45;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, seatH * 0.5, d * 0.9), fabricMat);
      seat.position.set(0, seatH * 0.6, 0.05);
      seat.castShadow = true;
      seat.receiveShadow = true;
      root.add(seat);

      // Backrest
      const backThick = d * 0.22;
      const backH = h * 0.65;
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(w, backH, backThick), fabricMat);
      backrest.position.set(0, seatH + backH / 2 - 0.05, -d / 2 + backThick / 2);
      backrest.castShadow = true;
      root.add(backrest);

      // Armrests (Left & Right)
      const armW = w * 0.12;
      const armH = h * 0.55;
      const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), fabricMat);
      armL.position.set(-w / 2 + armW / 2, armH / 2 + 0.05, 0);
      armL.castShadow = true;
      const armR = new THREE.Mesh(new THREE.BoxGeometry(armW, armH, d), fabricMat);
      armR.position.set(w / 2 - armW / 2, armH / 2 + 0.05, 0);
      armR.castShadow = true;
      root.add(armL, armR);

      // Cushions
      const numCushions = item.catalogId === 'sofa_modern' ? 3 : 1;
      const cushionW = (w - armW * 2) / numCushions - 0.02;
      for (let i = 0; i < numCushions; i++) {
        const cx = -w / 2 + armW + cushionW / 2 + i * (cushionW + 0.02);
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(cushionW, 0.1, d * 0.7), fabricMat);
        cushion.position.set(cx, seatH * 0.85 + 0.05, 0.08);
        cushion.castShadow = true;
        root.add(cushion);
      }

      // Legs (4 metal pins)
      const legGeom = new THREE.CylinderGeometry(0.02, 0.015, 0.15, 8);
      const legPositions = [
        [-w / 2 + 0.08, -d / 2 + 0.08],
        [w / 2 - 0.08, -d / 2 + 0.08],
        [-w / 2 + 0.08, d / 2 - 0.08],
        [w / 2 - 0.08, d / 2 - 0.08],
      ];
      legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, darkMetalMat);
        leg.position.set(lx, 0.075, lz);
        leg.castShadow = true;
        root.add(leg);
      });
      break;
    }

    case 'bed_king':
    case 'bed_single': {
      // Bed Frame
      const frameH = 0.25;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), woodMat);
      frame.position.set(0, frameH / 2, 0);
      frame.castShadow = true;
      root.add(frame);

      // Headboard
      const headH = h;
      const headThick = 0.1;
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, headH, headThick), fabricMat);
      headboard.position.set(0, headH / 2, -d / 2 + headThick / 2);
      headboard.castShadow = true;
      root.add(headboard);

      // Mattress
      const matW = w * 0.94;
      const matD = d * 0.92;
      const matH = 0.28;
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(matW, matH, matD), whiteMat);
      mattress.position.set(0, frameH + matH / 2, 0.04);
      mattress.castShadow = true;
      root.add(mattress);

      // Duvet / Blanket
      const duvet = new THREE.Mesh(new THREE.BoxGeometry(matW + 0.04, 0.06, matD * 0.7), fabricMat);
      duvet.position.set(0, frameH + matH + 0.03, matD * 0.15);
      duvet.castShadow = true;
      root.add(duvet);

      // Pillows
      const numPillows = item.catalogId === 'bed_king' ? 2 : 1;
      const pilW = matW / (numPillows + 0.4);
      for (let i = 0; i < numPillows; i++) {
        const px = numPillows === 1 ? 0 : -matW * 0.24 + i * (matW * 0.48);
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(pilW, 0.12, 0.4), whiteMat);
        pillow.position.set(px, frameH + matH + 0.06, -d / 2 + 0.35);
        pillow.rotation.x = 0.15;
        pillow.castShadow = true;
        root.add(pillow);
      }
      break;
    }

    case 'dining_table_6':
    case 'coffee_table': {
      // Tabletop
      const topThick = item.catalogId === 'coffee_table' ? 0.03 : 0.04;
      const topMat = item.catalogId === 'coffee_table' ? woodMat : whiteMat;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, topThick, d), topMat);
      top.position.set(0, h - topThick / 2, 0);
      top.castShadow = true;
      top.receiveShadow = true;
      root.add(top);

      // 4 Legs
      const legW = 0.05;
      const legH = h - topThick;
      const legGeom = new THREE.BoxGeometry(legW, legH, legW);
      const legPositions = [
        [-w / 2 + 0.08, -d / 2 + 0.08],
        [w / 2 - 0.08, -d / 2 + 0.08],
        [-w / 2 + 0.08, d / 2 - 0.08],
        [w / 2 - 0.08, d / 2 - 0.08],
      ];
      legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeom, darkMetalMat);
        leg.position.set(lx, legH / 2, lz);
        leg.castShadow = true;
        root.add(leg);
      });

      // If dining table, add 4 simple dining chairs tucked in
      if (item.catalogId === 'dining_table_6') {
        const chairMat = fabricMat;
        const chairPositions = [
          [-w * 0.28, -d / 2 - 0.22, 0],
          [w * 0.28, -d / 2 - 0.22, 0],
          [-w * 0.28, d / 2 + 0.22, Math.PI],
          [w * 0.28, d / 2 + 0.22, Math.PI],
        ];
        chairPositions.forEach(([cx, cz, rot]) => {
          const chairGroup = new THREE.Group();
          chairGroup.position.set(cx, 0, cz);
          chairGroup.rotation.y = rot;

          const seatC = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), chairMat);
          seatC.position.set(0, 0.45, 0);
          const backC = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.04), chairMat);
          backC.position.set(0, 0.65, -0.19);
          chairGroup.add(seatC, backC);

          // 4 chair legs
          const cLeg = new THREE.BoxGeometry(0.03, 0.45, 0.03);
          const cLegs = [
            [-0.17, -0.17],
            [0.17, -0.17],
            [-0.17, 0.17],
            [0.17, 0.17],
          ];
          cLegs.forEach(([clx, clz]) => {
            const legMesh = new THREE.Mesh(cLeg, darkMetalMat);
            legMesh.position.set(clx, 0.225, clz);
            chairGroup.add(legMesh);
          });

          root.add(chairGroup);
        });
      }
      break;
    }

    case 'kitchen_island': {
      // Cabinet base
      const baseH = h * 0.95;
      const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, baseH, d * 0.92), darkMetalMat);
      base.position.set(0, baseH / 2, 0);
      base.castShadow = true;
      root.add(base);

      // Quartz/Marble Countertop
      const counterThick = 0.05;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w, counterThick, d), whiteMat);
      counter.position.set(0, h - counterThick / 2, 0);
      counter.castShadow = true;
      root.add(counter);

      // Modern Gooseneck Faucet
      const faucetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15), chromeMat);
      faucetBase.position.set(0.3, h + 0.075, 0);
      const faucetNeck = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 16, Math.PI), chromeMat);
      faucetNeck.position.set(0.3, h + 0.15, 0);
      faucetNeck.rotation.z = Math.PI / 2;
      root.add(faucetBase, faucetNeck);
      break;
    }

    case 'bathtub_modern': {
      // Freestanding Oval Tub
      const tubGeom = new THREE.CylinderGeometry(w / 2, (w / 2) * 0.85, h, 24);
      tubGeom.scale(1, 1, d / w);
      const tub = new THREE.Mesh(tubGeom, whiteMat);
      tub.position.set(0, h / 2, 0);
      tub.castShadow = true;
      root.add(tub);

      // Mixer tap
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), chromeMat);
      tap.position.set(w / 2 - 0.1, h + 0.1, 0);
      root.add(tap);
      break;
    }

    case 'toilet': {
      // Wall-hung toilet bowl
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w * 0.4, h * 0.8, 16), whiteMat);
      bowl.position.set(0, h * 0.5, 0);
      bowl.scale.set(1, 1, 1.4);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.04, d * 0.9), whiteMat);
      lid.position.set(0, h * 0.9, 0);
      root.add(bowl, lid);
      break;
    }

    case 'indoor_plant': {
      // Pot
      const potH = h * 0.35;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.3, potH, 16), whiteMat);
      pot.position.set(0, potH / 2, 0);
      pot.castShadow = true;
      root.add(pot);

      // Soil
      const soil = new THREE.Mesh(new THREE.CircleGeometry(w * 0.38, 16), darkMetalMat);
      soil.rotation.x = -Math.PI / 2;
      soil.position.set(0, potH, 0);
      root.add(soil);

      // Leaf clusters
      const leafCount = 8;
      for (let i = 0; i < leafCount; i++) {
        const leafAngle = (i / leafCount) * Math.PI * 2;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, h * 0.6), plantMat);
        stem.position.set(Math.cos(leafAngle) * 0.06, potH + h * 0.25, Math.sin(leafAngle) * 0.06);
        stem.rotation.z = Math.cos(leafAngle) * 0.35;
        stem.rotation.x = Math.sin(leafAngle) * 0.35;
        root.add(stem);

        const leaf = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 8, 8), plantMat);
        leaf.scale.set(0.6, 1.5, 0.1);
        leaf.position.set(Math.cos(leafAngle) * 0.18, potH + h * 0.5, Math.sin(leafAngle) * 0.18);
        leaf.rotation.y = leafAngle;
        leaf.castShadow = true;
        root.add(leaf);
      }
      break;
    }

    case 'tv_unit': {
      // Floating Media console
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.7, d), darkMetalMat);
      cabinet.position.set(0, h * 0.35, 0);
      cabinet.castShadow = true;
      root.add(cabinet);

      // TV Screen
      const tvW = w * 0.85;
      const tvH = tvW * 0.56;
      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(tvW, tvH, 0.04), darkMetalMat);
      tvScreen.position.set(0, h + tvH / 2 + 0.1, 0);
      tvScreen.castShadow = true;

      // Stand
      const tvStand = new THREE.Mesh(new THREE.BoxGeometry(tvW * 0.3, 0.08, 0.2), chromeMat);
      tvStand.position.set(0, h + 0.04, 0);
      root.add(tvScreen, tvStand);
      break;
    }

    case 'desk_workstation':
    case 'nightstand':
    case 'wardrobe_closet':
    case 'bathroom_vanity':
    case 'office_chair':
    case 'refrigerator':
    default: {
      // Clean modern box with bevel / shadow
      const geom = new THREE.BoxGeometry(w, h, d);
      const mat = item.catalogId === 'refrigerator' ? chromeMat : woodMat;
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, h / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);

      // Add a handle or accent line
      const accent = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.02, d * 0.05), darkMetalMat);
      accent.position.set(0, h * 0.75, d / 2 + 0.01);
      root.add(accent);
      break;
    }
  }

  // Traverse and enable shadow casting
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData = { type: 'furniture', id: item.id };
    }
  });

  return root;
}
