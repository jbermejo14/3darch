import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useArchitectStore } from '../store/useArchitectStore';
import { createProceduralWall3D } from './ProceduralWall3D';
import { createProceduralFloor3D } from './ProceduralFloor3D';
import { createProceduralFurniture3D } from './ProceduralFurniture3D';
import { createProceduralStaircase3D } from './ProceduralStaircase3D';
import { 
  RotateCcw, 
  Sun, 
  Eye, 
  Layers, 
  Compass, 
  Footprints,
  Camera,
  Sliders,
  MoveVertical,
  EyeOff,
  Box
} from 'lucide-react';

interface Scene3DProps {
  className?: string;
}

export const Scene3D: React.FC<Scene3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zustand Store
  const project = useArchitectStore((s) => s.project);
  const activeLevelId = useArchitectStore((s) => s.activeLevelId);
  const setActiveLevel = useArchitectStore((s) => s.setActiveLevel);
  const selectedItem = useArchitectStore((s) => s.selectedItem);
  const setSelectedItem = useArchitectStore((s) => s.setSelectedItem);
  const showCeilings = useArchitectStore((s) => s.showCeilings);
  const setShowCeilings = useArchitectStore((s) => s.setShowCeilings);
  const wallDisplayMode = useArchitectStore((s) => s.wallDisplayMode);
  const setWallDisplayMode = useArchitectStore((s) => s.setWallDisplayMode);
  const cameraMode = useArchitectStore((s) => s.cameraMode);
  const setCameraMode = useArchitectStore((s) => s.setCameraMode);
  const showAllLevelsIn3D = useArchitectStore((s) => s.showAllLevelsIn3D);
  const setShowAllLevelsIn3D = useArchitectStore((s) => s.setShowAllLevelsIn3D);
  const explodedViewOffset = useArchitectStore((s) => s.explodedViewOffset);
  const setExplodedViewOffset = useArchitectStore((s) => s.setExplodedViewOffset);

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    levelGroups: Map<string, THREE.Group>;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    animFrameId: number;
    fpsKeys: Record<string, boolean>;
    fpsYaw: number;
    fpsPitch: number;
    isFpsLooking: boolean;
  } | null>(null);

  const [showExplodeSlider, setShowExplodeSlider] = useState(false);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19'); // modern deep slate
    scene.fog = new THREE.FogExp2('#0b0f19', 0.015);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(12, 14, 16);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't dip below ground
    controls.minDistance = 2;
    controls.maxDistance = 80;
    controls.target.set(0, 1.2, 0);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(50, 50, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Ground plane (subtle exterior lawn)
    const groundGeom = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x131a29,
      roughness: 0.95,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.02;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x1e293b, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.4);
    sunLight.position.set(20, 30, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 80;
    const shadowD = 20;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const levelGroups = new Map<string, THREE.Group>();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const fpsKeys: Record<string, boolean> = {};

    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      levelGroups,
      raycaster,
      mouse,
      animFrameId: 0,
      fpsKeys,
      fpsYaw: -Math.PI / 4,
      fpsPitch: 0,
      isFpsLooking: false,
    };

    // Keyboard handlers for FPS mode
    const handleKeyDown = (e: KeyboardEvent) => {
      fpsKeys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      fpsKeys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation Loop
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (threeRef.current) {
        const { camera: cam, controls: ctrl, scene: sc, renderer: rnd, fpsKeys: keys } = threeRef.current;

        // If in First-Person mode, handle WASD movement
        if (cameraMode === 'firstPerson') {
          ctrl.enabled = false;
          const speed = (keys['shift'] ? 6.0 : 3.2) * dt;

          const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, threeRef.current.fpsYaw, 0));
          const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, threeRef.current.fpsYaw, 0));

          if (keys['w'] || keys['arrowup']) cam.position.addScaledVector(forward, speed);
          if (keys['s'] || keys['arrowdown']) cam.position.addScaledVector(forward, -speed);
          if (keys['d'] || keys['arrowright']) cam.position.addScaledVector(right, speed);
          if (keys['a'] || keys['arrowleft']) cam.position.addScaledVector(right, -speed);

          // Keep eye height at active level altitude + 1.65m
          const activeLvl = project.levels.find((l) => l.id === activeLevelId);
          const alt = activeLvl ? activeLvl.altitude : 0;
          cam.position.y = alt + 1.65;

          // Camera rotation from yaw & pitch
          const euler = new THREE.Euler(threeRef.current.fpsPitch, threeRef.current.fpsYaw, 0, 'YXZ');
          cam.quaternion.setFromEuler(euler);
        } else {
          ctrl.enabled = true;
          ctrl.update();
        }

        rnd.render(sc, cam);
        threeRef.current.animFrameId = requestAnimationFrame(animate);
      }
    };

    threeRef.current.animFrameId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !threeRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (threeRef.current) {
        cancelAnimationFrame(threeRef.current.animFrameId);
        threeRef.current.renderer.dispose();
      }
    };
  }, []);

  // Update Scene when Project / Levels / Staircases / Exploded Offset change
  useEffect(() => {
    if (!threeRef.current) return;
    const { scene, levelGroups } = threeRef.current;

    // Clear old level groups
    levelGroups.forEach((grp) => scene.remove(grp));
    levelGroups.clear();

    const levelsToRender = showAllLevelsIn3D
      ? project.levels
      : project.levels.filter((l) => l.id === activeLevelId);

    // Calculate cumulative floor stacking altitudes so floors always sit flush without gaps
    let accumulatedAltitude = 0;
    const levelAltitudes = new Map<string, number>();
    project.levels.forEach((lvl) => {
      levelAltitudes.set(lvl.id, accumulatedAltitude);
      const h = lvl.wallHeight || 2.6;
      accumulatedAltitude = Number((accumulatedAltitude + h).toFixed(2));
    });

    levelsToRender.forEach((level, levelIdx) => {
      const levelGroup = new THREE.Group();
      levelGroup.name = `level_${level.id}`;

      // Calculate altitude including exploded offset
      const baseAltitude = levelAltitudes.get(level.id) ?? level.altitude;
      const yAltitude = baseAltitude + levelIdx * explodedViewOffset;
      levelGroup.position.set(0, yAltitude, 0);

      // Find staircases from lower floor that ascend into this floor to create a stairwell cutout in the floor slab
      const lowerLevel = project.levels.find(
        (l) => Math.abs(l.altitude - (level.altitude - (l.wallHeight || 2.6))) < 0.6
      ) || (levelIdx > 0 ? project.levels[levelIdx - 1] : null);

      const floorHoles: { x: number; y: number }[][] = [];
      if (lowerLevel && lowerLevel.staircases) {
        lowerLevel.staircases.forEach((stair) => {
          const rad = (stair.rotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const hw = (stair.width + 0.15) / 2;
          const hl = (stair.length + 0.2) / 2;

          const localCorners = [
            { x: -hw, y: -hl },
            { x: hw, y: -hl },
            { x: hw, y: hl },
            { x: -hw, y: hl },
          ];

          const worldHole = localCorners.map((c) => ({
            x: stair.x + c.x * cos - c.y * sin,
            y: stair.y + c.x * sin + c.y * cos,
          }));

          floorHoles.push(worldHole);
        });
      }

      // Find staircases on THIS floor that ascend upward to create a ceiling cutout
      const ceilingHoles: { x: number; y: number }[][] = [];
      if (level.staircases && level.staircases.length > 0) {
        level.staircases.forEach((stair) => {
          const rad = (stair.rotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const hw = (stair.width + 0.15) / 2;
          const hl = (stair.length + 0.2) / 2;

          const localCorners = [
            { x: -hw, y: -hl },
            { x: hw, y: -hl },
            { x: hw, y: hl },
            { x: -hw, y: hl },
          ];

          const worldHole = localCorners.map((c) => ({
            x: stair.x + c.x * cos - c.y * sin,
            y: stair.y + c.x * sin + c.y * cos,
          }));

          ceilingHoles.push(worldHole);
        });
      }

      // 1. Procedural Floors (with stairwell cutout holes)
      level.rooms.forEach((room) => {
        const isSelected = selectedItem?.type === 'room' && selectedItem.id === room.id;
        const { floorMesh, ceilingMesh, skirtingGroup } = createProceduralFloor3D(
          room,
          level.wallHeight,
          showCeilings,
          isSelected,
          floorHoles,
          ceilingHoles
        );
        levelGroup.add(floorMesh);
        if (ceilingMesh) levelGroup.add(ceilingMesh);
        if (skirtingGroup) levelGroup.add(skirtingGroup);
      });

      // 2. Procedural Walls
      level.walls.forEach((wall) => {
        const isSelected = selectedItem?.type === 'wall' && selectedItem.id === wall.id;
        // Guarantee wall height is at least level.wallHeight to prevent empty gaps
        const wallToRender = {
          ...wall,
          height: Math.max(wall.height || 0, level.wallHeight || 2.6),
        };
        const { group: wallGroup } = createProceduralWall3D(wallToRender, level.openings, isSelected, wallDisplayMode);
        levelGroup.add(wallGroup);
      });

      // 3. Procedural Furniture
      level.furniture.forEach((item) => {
        const isSelected = selectedItem?.type === 'furniture' && selectedItem.id === item.id;
        const fGroup = createProceduralFurniture3D(item, isSelected);
        levelGroup.add(fGroup);
      });

      // 4. Procedural Staircases (height reaching upper floor, railing eliminated)
      (level.staircases || []).forEach((stair) => {
        const isSelected = selectedItem?.type === 'stairs' && selectedItem.id === stair.id;
        const targetH = level.wallHeight || 2.6;
        const stairToRender = {
          ...stair,
          height: stair.height ? Math.max(stair.height, targetH) : targetH,
          hasRailing: false,
        };
        const sGroup = createProceduralStaircase3D(stairToRender, isSelected);
        levelGroup.add(sGroup);
      });

      scene.add(levelGroup);
      levelGroups.set(level.id, levelGroup);
    });
  }, [project, activeLevelId, selectedItem, showCeilings, showAllLevelsIn3D, explodedViewOffset, wallDisplayMode]);

  // Click Raycasting to Select 3D Objects
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!threeRef.current || !canvasRef.current) return;

    if (cameraMode === 'firstPerson') {
      threeRef.current.isFpsLooking = true;
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    threeRef.current.raycaster.setFromCamera(new THREE.Vector2(x, y), threeRef.current.camera);

    const activeGrp = threeRef.current.levelGroups.get(activeLevelId);
    if (!activeGrp) return;

    const intersects = threeRef.current.raycaster.intersectObjects(activeGrp.children, true);

    if (intersects.length > 0) {
      // Find object with userData
      let hit = intersects[0].object;
      while (hit && (!hit.userData || !hit.userData.type) && hit.parent && hit.parent !== activeGrp) {
        hit = hit.parent as THREE.Mesh;
      }

      if (hit && hit.userData && hit.userData.type) {
        setSelectedItem({
          type: hit.userData.type,
          id: hit.userData.id,
        });
        return;
      }
    }

    // Clicked empty area
    setSelectedItem(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!threeRef.current) return;

    if (cameraMode === 'firstPerson' && threeRef.current.isFpsLooking) {
      const sensitivity = 0.003;
      threeRef.current.fpsYaw -= e.movementX * sensitivity;
      threeRef.current.fpsPitch -= e.movementY * sensitivity;
      // Clamp pitch to not flip upside down
      threeRef.current.fpsPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, threeRef.current.fpsPitch));
    }
  };

  const handlePointerUp = () => {
    if (threeRef.current) {
      threeRef.current.isFpsLooking = false;
    }
  };

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (!threeRef.current) return;
    const { camera, controls } = threeRef.current;
    camera.position.set(12, 14, 16);
    controls.target.set(0, 1.2, 0);
    controls.update();
  }, []);

  // Top-Down Ortho-like perspective
  const handleTopDown = useCallback(() => {
    if (!threeRef.current) return;
    const { camera, controls } = threeRef.current;
    camera.position.set(0, 24, 0.001);
    controls.target.set(0, 0, 0);
    controls.update();
  }, []);

  // Take Snapshot
  const handleTakeSnapshot = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `render-3d-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full select-none overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Floating 3D Control Bar (Top Left) */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-2xl z-10">
        <button
          onClick={handleResetCamera}
          title="Centrar y Resetear Vista 3D"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Centrar</span>
        </button>

        <button
          onClick={handleTopDown}
          title="Vista 3D Cenital (Planta)"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Cenital</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-700/60 mx-1" />

        {/* First Person Walkthrough Toggle */}
        <button
          onClick={() => {
            const nextMode = cameraMode === 'firstPerson' ? 'orbit' : 'firstPerson';
            setCameraMode(nextMode);
            if (nextMode === 'firstPerson' && threeRef.current) {
              const activeLvl = project.levels.find((l) => l.id === activeLevelId);
              const alt = activeLvl ? activeLvl.altitude : 0;
              threeRef.current.camera.position.set(0, alt + 1.65, 0);
            }
          }}
          title={cameraMode === 'firstPerson' ? 'Salir de Primera Persona' : 'Paseo Virtual 3D (Primera Persona)'}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
            cameraMode === 'firstPerson'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Footprints className="w-4 h-4 text-amber-400" />
          <span>{cameraMode === 'firstPerson' ? 'Modo Órbita' : 'Paseo Virtual'}</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-700/60 mx-1" />

        {/* Wall Display Mode Buttons (Paredes ON / Bajas 0.8m / Sin Paredes) */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-700/60 shadow-inner">
          <button
            onClick={() => setWallDisplayMode('full')}
            title="Paredes Completas (Altura normal)"
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
              wallDisplayMode === 'full'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paredes ON</span>
          </button>
          <button
            onClick={() => setWallDisplayMode('low')}
            title="Paredes Bajas (Corte a 0.85m estilo maqueta para ver la distribución)"
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
              wallDisplayMode === 'low'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Bajas</span>
          </button>
          <button
            onClick={() => setWallDisplayMode('hidden')}
            title="Sin Paredes (Vista despejada de suelos, estancias y muebles)"
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
              wallDisplayMode === 'hidden'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-300" />
            <span>Sin Paredes</span>
          </button>
        </div>

        <div className="w-[1px] h-5 bg-slate-700/60 mx-1" />

        {/* Ceiling Toggle */}
        <button
          onClick={() => setShowCeilings(!showCeilings)}
          title={showCeilings ? 'Ocultar Techo' : 'Mostrar Techo'}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
            showCeilings
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="hidden md:inline">{showCeilings ? 'Techo ON' : 'Techo OFF'}</span>
        </button>

        {/* All Levels Toggle */}
        <button
          onClick={() => setShowAllLevelsIn3D(!showAllLevelsIn3D)}
          title={showAllLevelsIn3D ? 'Ver sólo planta actual' : 'Ver todas las plantas superpuestas'}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
            showAllLevelsIn3D
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden md:inline">{showAllLevelsIn3D ? 'Ver Ambas' : 'Planta Sola'}</span>
        </button>

        {/* Exploded View Toggle (Separar Plantas en 3D) */}
        {project.levels.length > 1 && (
          <div className="relative flex items-center">
            <button
              onClick={() => setShowExplodeSlider(!showExplodeSlider)}
              title="Separar Plantas Verticalmente (Vista Explosionada)"
              className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${
                explodedViewOffset > 0
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MoveVertical className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline">
                {explodedViewOffset > 0 ? `Separadas ${explodedViewOffset.toFixed(1)}m` : 'Separar Pisos'}
              </span>
            </button>

            {showExplodeSlider && (
              <div className="absolute left-0 top-full mt-2 bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl flex flex-col gap-2 z-50 w-64">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Separación Vertical</span>
                  <span className="text-cyan-400 font-mono font-bold text-xs">{explodedViewOffset.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16.0"
                  step="0.25"
                  value={explodedViewOffset}
                  onChange={(e) => setExplodedViewOffset(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0m</span>
                  <span>4m</span>
                  <span>8m</span>
                  <span>16m</span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {[
                    { label: 'Juntas', val: 0 },
                    { label: '3m', val: 3 },
                    { label: '6m', val: 6 },
                    { label: '10m', val: 10 },
                    { label: '15m', val: 15 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      onClick={() => setExplodedViewOffset(preset.val)}
                      className={`py-1 rounded text-[10px] font-medium transition ${
                        Math.abs(explodedViewOffset - preset.val) < 0.2
                          ? 'bg-cyan-600 text-white font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="w-[1px] h-5 bg-slate-700/60 mx-1" />

        {/* Snapshot */}
        <button
          onClick={handleTakeSnapshot}
          title="Tomar Captura de Pantalla 3D (PNG)"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
        >
          <Camera className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      {/* Persistent Floating Floor Separation HUD when multiple floors exist */}
      {project.levels.length > 1 && cameraMode !== 'firstPerson' && (
        <div className="absolute bottom-5 left-5 z-20 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-cyan-500/30 shadow-2xl flex flex-col gap-2 min-w-[270px] max-w-[320px]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <MoveVertical className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Separación de Pisos</span>
            </div>
            <span className="font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80 text-[11px]">
              {explodedViewOffset === 0 ? '0.0 m (Juntas)' : `${explodedViewOffset.toFixed(1)} m`}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="16.0"
            step="0.25"
            value={explodedViewOffset}
            onChange={(e) => setExplodedViewOffset(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
          />

          <div className="grid grid-cols-5 gap-1">
            {[
              { label: 'Juntas', val: 0 },
              { label: '3m', val: 3 },
              { label: '6m', val: 6 },
              { label: '10m', val: 10 },
              { label: '15m', val: 15 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setExplodedViewOffset(p.val)}
                className={`py-1 rounded text-[10px] font-semibold transition ${
                  Math.abs(explodedViewOffset - p.val) < 0.25
                    ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                    : 'bg-slate-800/90 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* First Person HUD Overlay */}
      {cameraMode === 'firstPerson' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
          {/* Aim Reticle */}
          <div className="w-2.5 h-2.5 rounded-full border-2 border-white/60 bg-white/20 shadow-md my-auto" />

          {/* FPS Instructions Banner */}
          <div className="bg-slate-950/85 backdrop-blur-md px-5 py-3 rounded-2xl border border-amber-500/40 text-amber-200 text-xs shadow-2xl flex items-center gap-4">
            <Footprints className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
            <div>
              <div className="font-semibold text-amber-300">Modo Paseo Virtual Activo</div>
              <div className="text-slate-300 text-[11px] mt-0.5">
                Usa <span className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">W A S D</span> para moverte,{' '}
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">Shift</span> para correr y arrastra el ratón para mirar.
              </div>
            </div>
            <button
              onClick={() => setCameraMode('orbit')}
              className="pointer-events-auto px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              Salir
            </button>
          </div>
        </div>
      )}

      {/* Bottom Right 3D Info Badge */}
      <div className="absolute bottom-4 right-4 pointer-events-none flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 backdrop-blur-sm rounded-lg border border-slate-800 text-[11px] text-slate-400">
        <Sun className="w-3.5 h-3.5 text-amber-400" />
        <span>Three.js WebGL • Sombras Suaves • Altura Techo: {project.levels.find(l => l.id === activeLevelId)?.wallHeight ?? 2.6}m</span>
      </div>
    </div>
  );
};
