import * as THREE from 'three';
import { FloorTextureType } from '../types/architectural';

const textureCache = new Map<string, THREE.CanvasTexture>();

export function createProceduralFloorTexture(type: FloorTextureType, baseColor = '#e2d7c7'): THREE.CanvasTexture {
  const cacheKey = `${type}_${baseColor}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  switch (type) {
    case 'wood':
    case 'parquet': {
      // Wood plank pattern
      ctx.fillStyle = baseColor || '#c89d66';
      ctx.fillRect(0, 0, 512, 512);

      const plankHeight = 32;
      const numPlanks = 512 / plankHeight;

      for (let i = 0; i < numPlanks; i++) {
        const y = i * plankHeight;
        // Subtle plank color variation
        const shade = (Math.random() - 0.5) * 15;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.04 + Math.random() * 0.04})`;
        ctx.fillRect(0, y, 512, plankHeight);

        // Plank joint line
        ctx.fillStyle = 'rgba(60, 40, 20, 0.4)';
        ctx.fillRect(0, y + plankHeight - 1, 512, 1.5);

        // Vertical joints
        const offset = (i % 2) * 128 + Math.floor(Math.random() * 20);
        for (let x = offset; x < 512; x += 256) {
          ctx.fillRect(x, y, 1.5, plankHeight);
        }

        // Wood grain
        ctx.strokeStyle = 'rgba(80, 50, 20, 0.07)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          ctx.beginPath();
          ctx.moveTo(0, y + 4 + g * 6);
          ctx.bezierCurveTo(
            150, y + 4 + g * 6 + Math.sin(i) * 5,
            350, y + 4 + g * 6 - Math.cos(i) * 5,
            512, y + 4 + g * 6
          );
          ctx.stroke();
        }
      }
      break;
    }

    case 'tiles': {
      // Modern ceramic floor tiles (64x64 grids with grout)
      ctx.fillStyle = baseColor || '#e8ecef';
      ctx.fillRect(0, 0, 512, 512);

      const tileSize = 64;
      const grout = 3;

      for (let x = 0; x < 512; x += tileSize) {
        for (let y = 0; y < 512; y += tileSize) {
          // Tile surface subtle gradient
          const grad = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
          ctx.fillStyle = grad;
          ctx.fillRect(x + grout, y + grout, tileSize - grout * 2, tileSize - grout * 2);

          // Grout borders
          ctx.fillStyle = '#b0b8c0';
          ctx.fillRect(x, y, tileSize, grout);
          ctx.fillRect(x, y, grout, tileSize);
        }
      }
      break;
    }

    case 'marble': {
      // Luxury marble with smooth veining
      ctx.fillStyle = baseColor || '#f4f4f6';
      ctx.fillRect(0, 0, 512, 512);

      // Soft cloudiness
      for (let i = 0; i < 30; i++) {
        const cx = Math.random() * 512;
        const cy = Math.random() * 512;
        const rad = 40 + Math.random() * 80;
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rad);
        grad.addColorStop(0, 'rgba(180, 185, 195, 0.12)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Elegant grey/gold veins
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(140, 145, 155, 0.25)';
      ctx.filter = 'blur(1px)';
      for (let v = 0; v < 5; v++) {
        ctx.beginPath();
        let vx = Math.random() * 100;
        let vy = v * 100;
        ctx.moveTo(vx, vy);
        while (vx < 512) {
          vx += 40 + Math.random() * 50;
          vy += (Math.random() - 0.5) * 60;
          ctx.lineTo(vx, vy);
        }
        ctx.stroke();
      }
      ctx.filter = 'none';

      // Subtle tile lines for marble slabs
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 256, 256);
      ctx.strokeRect(256, 0, 256, 256);
      ctx.strokeRect(0, 256, 256, 256);
      ctx.strokeRect(256, 256, 256, 256);
      break;
    }

    case 'carpet': {
      // Dense cozy carpet fibers
      ctx.fillStyle = baseColor || '#475569';
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 15000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';
        ctx.fillRect(x, y, 2, 2);
      }
      break;
    }

    case 'concrete':
    default: {
      // Modern smooth polished concrete with micro-specks
      ctx.fillStyle = baseColor || '#94a3b8';
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(x, y, 2, 2);
      }

      // Expansion joints
      ctx.strokeStyle = 'rgba(40, 50, 60, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 256, 256);
      ctx.strokeRect(256, 0, 256, 256);
      ctx.strokeRect(0, 256, 256, 256);
      ctx.strokeRect(256, 256, 256, 256);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function createProceduralWallTexture(baseColor = '#f8fafc'): THREE.CanvasTexture {
  const cacheKey = `wall_${baseColor}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle architectural plaster stippling
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  textureCache.set(cacheKey, texture);
  return texture;
}
