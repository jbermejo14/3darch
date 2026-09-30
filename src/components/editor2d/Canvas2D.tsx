import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useArchitectStore } from '../../store/useArchitectStore';
import { Point2D, Wall, Opening, FurnitureItem, Room } from '../../types/architectural';
import { 
  METERS_TO_PIXELS_DEFAULT, 
  distance, 
  snapPointToGrid, 
  snapPointToAngles, 
  findNearestWallVertex, 
  findNearestWall,
  calculatePolygonCentroid
} from '../../utils/geometry2d';
import { FURNITURE_CATALOG } from '../../store/furnitureCatalog';

interface Canvas2DProps {
  className?: string;
}

export const Canvas2D: React.FC<Canvas2DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store state
  const project = useArchitectStore((s) => s.project);
  const activeLevelId = useArchitectStore((s) => s.activeLevelId);
  const activeTool = useArchitectStore((s) => s.activeTool);
  const setActiveTool = useArchitectStore((s) => s.setActiveTool);
  const selectedItem = useArchitectStore((s) => s.selectedItem);
  const setSelectedItem = useArchitectStore((s) => s.setSelectedItem);
  const selectedCatalogItemId = useArchitectStore((s) => s.selectedCatalogItemId);
  const gridSnap = useArchitectStore((s) => s.gridSnap);
  const gridSize = useArchitectStore((s) => s.gridSize);
  const angleSnap = useArchitectStore((s) => s.angleSnap);
  const showDimensions = useArchitectStore((s) => s.showDimensions);
  const showUnderlayFloor = useArchitectStore((s) => s.showUnderlayFloor);
  const setShowUnderlayFloor = useArchitectStore((s) => s.setShowUnderlayFloor);
  const zoom = useArchitectStore((s) => s.zoom);
  const setZoom = useArchitectStore((s) => s.setZoom);
  const pan = useArchitectStore((s) => s.pan);
  const setPan = useArchitectStore((s) => s.setPan);
  const setCursorWorldPos = useArchitectStore((s) => s.setCursorWorldPos);
  const getLowerLevel = useArchitectStore((s) => s.getLowerLevel);

  // Store actions
  const addWall = useArchitectStore((s) => s.addWall);
  const updateWall = useArchitectStore((s) => s.updateWall);
  const deleteWall = useArchitectStore((s) => s.deleteWall);
  const addOpening = useArchitectStore((s) => s.addOpening);
  const updateOpening = useArchitectStore((s) => s.updateOpening);
  const deleteOpening = useArchitectStore((s) => s.deleteOpening);
  const addFurniture = useArchitectStore((s) => s.addFurniture);
  const updateFurniture = useArchitectStore((s) => s.updateFurniture);
  const deleteFurniture = useArchitectStore((s) => s.deleteFurniture);
  const addStaircase = useArchitectStore((s) => s.addStaircase);
  const updateStaircase = useArchitectStore((s) => s.updateStaircase);
  const deleteStaircase = useArchitectStore((s) => s.deleteStaircase);
  const selectedStaircaseType = useArchitectStore((s) => s.selectedStaircaseType);

  // Active level data
  const activeLevel = project.levels.find((l) => l.id === activeLevelId) || project.levels[0];
  const lowerLevel = getLowerLevel();

  // Local drawing & interaction states
  const [wallStartPoint, setWallStartPoint] = useState<Point2D | null>(null);
  const [currentMouseWorld, setCurrentMouseWorld] = useState<Point2D>({ x: 0, y: 0 });
  const [snappedMouseWorld, setSnappedMouseWorld] = useState<Point2D>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
  const [draggingStair, setDraggingStair] = useState<{ id: string; offset: Point2D } | null>(null);
  const [rotatingStair, setRotatingStair] = useState<{ id: string; startAngle: number } | null>(null);
  
  // Dragging states
  const [draggingVertex, setDraggingVertex] = useState<{ wallId: string; isStart: boolean } | null>(null);
  const [draggingFurniture, setDraggingFurniture] = useState<{ id: string; offset: Point2D } | null>(null);
  const [rotatingFurniture, setRotatingFurniture] = useState<{ id: string; startAngle: number; initialRot: number } | null>(null);
  const [slidingOpening, setSlidingOpening] = useState<{ id: string; wallId: string } | null>(null);
  const [measureStart, setMeasureStart] = useState<Point2D | null>(null);

  // Conversion: World (meters) <-> Screen (pixels)
  const scale = METERS_TO_PIXELS_DEFAULT * zoom;

  const worldToScreen = useCallback((p: Point2D): Point2D => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;
    return {
      x: cx + pan.x + p.x * scale,
      y: cy + pan.y + p.y * scale,
    };
  }, [pan, scale]);

  const screenToWorld = useCallback((screenPt: Point2D): Point2D => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;
    return {
      x: (screenPt.x - cx - pan.x) / scale,
      y: (screenPt.y - cy - pan.y) / scale,
    };
  }, [pan, scale]);

  // Main Render Loop for 2D Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0f172a'; // Deep slate background
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2 + pan.x;
    const cy = height / 2 + pan.y;

    // 0. Draw Underlay Ghost Floor of Lower Level (Planta Fantasma)
    if (showUnderlayFloor && lowerLevel) {
      drawUnderlayFloor(ctx, lowerLevel, worldToScreen);
    }

    // 1. Draw Architectural Grid
    drawGrid(ctx, width, height, cx, cy, scale, gridSize);

    // 2. Draw Rooms (Polygons & Areas)
    drawRooms(ctx, activeLevel.rooms, worldToScreen, selectedItem);

    // 3. Draw Walls
    drawWalls(ctx, activeLevel.walls, worldToScreen, selectedItem, showDimensions);

    // 4. Draw Openings (Doors & Windows)
    drawOpenings(ctx, activeLevel.walls, activeLevel.openings, worldToScreen, selectedItem);

    // 5. Draw Staircases
    drawStaircases(ctx, activeLevel.staircases || [], worldToScreen, scale, selectedItem);

    // 6. Draw Furniture
    drawFurniture(ctx, activeLevel.furniture, worldToScreen, scale, selectedItem);

    // 7. Draw Active Tool Previews (Wall drawing, Opening placement, Furniture preview, Stairs preview)
    drawToolPreview(
      ctx,
      activeTool,
      wallStartPoint,
      snappedMouseWorld,
      activeLevel.walls,
      selectedCatalogItemId,
      selectedStaircaseType,
      worldToScreen,
      scale,
      measureStart
    );

    // 8. Draw Selection Handles & Transform Gizmos
    drawSelectionGizmos(
      ctx,
      selectedItem,
      activeLevel,
      worldToScreen,
      scale
    );

  }, [
    activeLevel,
    lowerLevel,
    showUnderlayFloor,
    pan,
    zoom,
    scale,
    selectedItem,
    activeTool,
    wallStartPoint,
    snappedMouseWorld,
    selectedCatalogItemId,
    selectedStaircaseType,
    showDimensions,
    measureStart,
    worldToScreen,
    gridSize,
  ]);

  // Resize canvas to parent container
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute Snapped Coordinate
  const computeSnappedPos = useCallback(
    (worldPt: Point2D, refStart?: Point2D | null): Point2D => {
      let pt = { ...worldPt };

      // Angle snap if drawing wall from a start point
      if (angleSnap && refStart) {
        pt = snapPointToAngles(refStart, pt);
      }

      // Magnetic snap to wall vertices
      const nearestVertex = findNearestWallVertex(pt, activeLevel.walls, 0.3);
      if (nearestVertex) {
        return nearestVertex.point;
      }

      // Grid snap
      if (gridSnap) {
        pt = snapPointToGrid(pt, gridSize);
      }

      return pt;
    },
    [gridSnap, gridSize, angleSnap, activeLevel.walls]
  );

  // Mouse / Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const rawWorld = screenToWorld(screenPt);

    // Pan with middle click or space key or if pan tool is selected
    if (e.button === 1 || activeTool === 'pan' || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: screenPt.x - pan.x, y: screenPt.y - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only left click for tools

    // TOOL: WALL
    if (activeTool === 'wall') {
      const snapped = computeSnappedPos(rawWorld, wallStartPoint);
      if (!wallStartPoint) {
        setWallStartPoint(snapped);
      } else {
        const d = distance(wallStartPoint, snapped);
        if (d >= 0.2) {
          addWall(wallStartPoint, snapped);
          // Chain wall drawing
          setWallStartPoint(snapped);
        }
      }
      return;
    }

    // TOOL: DOOR or WINDOW
    if (activeTool === 'door' || activeTool === 'window') {
      const match = findNearestWall(rawWorld, activeLevel.walls, 0.6);
      if (match) {
        addOpening(match.wall.id, activeTool, match.ratio);
        setActiveTool('select');
      }
      return;
    }

    // TOOL: FURNITURE
    if (activeTool === 'furniture') {
      const snapped = gridSnap ? snapPointToGrid(rawWorld, gridSize) : rawWorld;
      addFurniture(selectedCatalogItemId || 'sofa_modern', snapped.x, snapped.y, 0);
      setActiveTool('select');
      return;
    }

    // TOOL: STAIRS
    if (activeTool === 'stairs') {
      const snapped = gridSnap ? snapPointToGrid(rawWorld, gridSize) : rawWorld;
      addStaircase(selectedStaircaseType, snapped.x, snapped.y, 0);
      setActiveTool('select');
      return;
    }

    // TOOL: MEASURE
    if (activeTool === 'measure') {
      const snapped = computeSnappedPos(rawWorld);
      if (!measureStart) {
        setMeasureStart(snapped);
      } else {
        setMeasureStart(null);
      }
      return;
    }

    // TOOL: SELECT & EDITING
    if (activeTool === 'select') {
      // 1. Check if clicking rotation gizmo of selected furniture
      if (selectedItem?.type === 'furniture') {
        const item = activeLevel.furniture.find((f) => f.id === selectedItem.id);
        if (item) {
          const itemSc = worldToScreen({ x: item.x, y: item.y });
          const rotGizmoSc = {
            x: itemSc.x + Math.sin((item.rotation * Math.PI) / 180) * (item.depth * scale * 0.5 + 24),
            y: itemSc.y - Math.cos((item.rotation * Math.PI) / 180) * (item.depth * scale * 0.5 + 24),
          };
          if (Math.hypot(screenPt.x - rotGizmoSc.x, screenPt.y - rotGizmoSc.y) < 14) {
            setRotatingFurniture({
              id: item.id,
              startAngle: Math.atan2(screenPt.y - itemSc.y, screenPt.x - itemSc.x),
              initialRot: item.rotation,
            });
            return;
          }
        }
      }

      // 1.5 Check if clicking rotation gizmo of selected stairs
      if (selectedItem?.type === 'stairs') {
        const stair = (activeLevel.staircases || []).find((s) => s.id === selectedItem.id);
        if (stair) {
          const stairSc = worldToScreen({ x: stair.x, y: stair.y });
          const rotGizmoSc = {
            x: stairSc.x + Math.sin((stair.rotation * Math.PI) / 180) * (stair.length * scale * 0.5 + 24),
            y: stairSc.y - Math.cos((stair.rotation * Math.PI) / 180) * (stair.length * scale * 0.5 + 24),
          };
          if (Math.hypot(screenPt.x - rotGizmoSc.x, screenPt.y - rotGizmoSc.y) < 14) {
            setRotatingStair({
              id: stair.id,
              startAngle: Math.atan2(screenPt.y - stairSc.y, screenPt.x - stairSc.x),
            });
            return;
          }
        }
      }

      // 2. Check if clicking wall vertex handle of selected wall
      if (selectedItem?.type === 'wall') {
        const wall = activeLevel.walls.find((w) => w.id === selectedItem.id);
        if (wall) {
          const sSc = worldToScreen(wall.start);
          const eSc = worldToScreen(wall.end);
          if (Math.hypot(screenPt.x - sSc.x, screenPt.y - sSc.y) < 14) {
            setDraggingVertex({ wallId: wall.id, isStart: true });
            return;
          }
          if (Math.hypot(screenPt.x - eSc.x, screenPt.y - eSc.y) < 14) {
            setDraggingVertex({ wallId: wall.id, isStart: false });
            return;
          }
        }
      }

      // 3. Check Furniture click
      for (let i = activeLevel.furniture.length - 1; i >= 0; i--) {
        const f = activeLevel.furniture[i];
        const halfW = f.width / 2;
        const halfD = f.depth / 2;
        const d = distance(rawWorld, { x: f.x, y: f.y });
        if (d <= Math.max(halfW, halfD)) {
          setSelectedItem({ type: 'furniture', id: f.id });
          setDraggingFurniture({
            id: f.id,
            offset: { x: rawWorld.x - f.x, y: rawWorld.y - f.y },
          });
          return;
        }
      }

      // 3.5 Check Staircases click
      for (const st of (activeLevel.staircases || [])) {
        if (distance(rawWorld, { x: st.x, y: st.y }) <= Math.max(st.width, st.length) / 1.5) {
          setSelectedItem({ type: 'stairs', id: st.id });
          setDraggingStair({
            id: st.id,
            offset: { x: rawWorld.x - st.x, y: rawWorld.y - st.y },
          });
          return;
        }
      }

      // 4. Check Opening click
      for (const op of activeLevel.openings) {
        const wall = activeLevel.walls.find((w) => w.id === op.wallId);
        if (!wall) continue;
        const opPos = {
          x: wall.start.x + (wall.end.x - wall.start.x) * op.distanceRatio,
          y: wall.start.y + (wall.end.y - wall.start.y) * op.distanceRatio,
        };
        if (distance(rawWorld, opPos) < 0.5) {
          setSelectedItem({ type: 'opening', id: op.id });
          setSlidingOpening({ id: op.id, wallId: wall.id });
          return;
        }
      }

      // 5. Check Wall click
      const hitWall = findNearestWall(rawWorld, activeLevel.walls, 0.3);
      if (hitWall) {
        setSelectedItem({ type: 'wall', id: hitWall.wall.id });
        return;
      }

      // 6. Check Room click (centroid or inside polygon)
      for (const room of activeLevel.rooms) {
        const centroid = calculatePolygonCentroid(room.polygonPoints);
        if (distance(rawWorld, centroid) < 1.2) {
          setSelectedItem({ type: 'room', id: room.id });
          return;
        }
      }

      // Clicked empty canvas
      setSelectedItem(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const rawWorld = screenToWorld(screenPt);

    setCurrentMouseWorld(rawWorld);
    setCursorWorldPos(rawWorld);

    // Pan drag
    if (isPanning) {
      setPan({
        x: screenPt.x - panStart.x,
        y: screenPt.y - panStart.y,
      });
      return;
    }

    const snapped = computeSnappedPos(rawWorld, wallStartPoint);
    setSnappedMouseWorld(snapped);

    // Dragging Wall Vertex
    if (draggingVertex) {
      const wall = activeLevel.walls.find((w) => w.id === draggingVertex.wallId);
      if (wall) {
        const pt = computeSnappedPos(rawWorld);
        if (draggingVertex.isStart) {
          updateWall(wall.id, { start: pt });
        } else {
          updateWall(wall.id, { end: pt });
        }
      }
      return;
    }

    // Dragging Furniture
    if (draggingFurniture) {
      let targetX = rawWorld.x - draggingFurniture.offset.x;
      let targetY = rawWorld.y - draggingFurniture.offset.y;
      if (gridSnap) {
        targetX = Math.round(targetX / gridSize) * gridSize;
        targetY = Math.round(targetY / gridSize) * gridSize;
      }
      updateFurniture(draggingFurniture.id, { x: targetX, y: targetY });
      return;
    }

    // Rotating Furniture
    if (rotatingFurniture) {
      const item = activeLevel.furniture.find((f) => f.id === rotatingFurniture.id);
      if (item) {
        const itemSc = worldToScreen({ x: item.x, y: item.y });
        const curAngle = Math.atan2(screenPt.y - itemSc.y, screenPt.x - itemSc.x);
        let deg = ((curAngle + Math.PI / 2) * 180) / Math.PI;
        deg = (deg + 360) % 360;
        if (angleSnap) {
          deg = Math.round(deg / 15) * 15;
        }
        updateFurniture(item.id, { rotation: Math.round(deg) });
      }
      return;
    }

    // Dragging Staircase
    if (draggingStair) {
      let targetX = rawWorld.x - draggingStair.offset.x;
      let targetY = rawWorld.y - draggingStair.offset.y;
      if (gridSnap) {
        targetX = Math.round(targetX / gridSize) * gridSize;
        targetY = Math.round(targetY / gridSize) * gridSize;
      }
      updateStaircase(draggingStair.id, { x: targetX, y: targetY });
      return;
    }

    // Rotating Staircase
    if (rotatingStair) {
      const stair = (activeLevel.staircases || []).find((s) => s.id === rotatingStair.id);
      if (stair) {
        const stairSc = worldToScreen({ x: stair.x, y: stair.y });
        const curAngle = Math.atan2(screenPt.y - stairSc.y, screenPt.x - stairSc.x);
        let deg = ((curAngle + Math.PI / 2) * 180) / Math.PI;
        deg = (deg + 360) % 360;
        if (angleSnap) {
          deg = Math.round(deg / 15) * 15;
        }
        updateStaircase(stair.id, { rotation: Math.round(deg) });
      }
      return;
    }

    // Sliding Opening along Wall
    if (slidingOpening) {
      const wall = activeLevel.walls.find((w) => w.id === slidingOpening.wallId);
      if (wall) {
        const hit = findNearestWall(rawWorld, [wall], 2.0);
        if (hit) {
          updateOpening(slidingOpening.id, { distanceRatio: Math.max(0.1, Math.min(0.9, hit.ratio)) });
        }
      }
      return;
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggingVertex(null);
    setDraggingFurniture(null);
    setRotatingFurniture(null);
    setDraggingStair(null);
    setRotatingStair(null);
    setSlidingOpening(null);
  };

  // Zoom with Wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(4.0, Math.max(0.2, zoom * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Zoom centered on cursor
    const scaleRatio = newZoom / zoom;
    setPan((p) => ({
      x: mouseX - cx - (mouseX - cx - p.x) * scaleRatio,
      y: mouseY - cy - (mouseY - cy - p.y) * scaleRatio,
    }));
    setZoom(newZoom);
  };

  // Right Click / Context Menu: Cancel wall chain or active tool
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (wallStartPoint) {
      setWallStartPoint(null);
    } else if (measureStart) {
      setMeasureStart(null);
    } else {
      setActiveTool('select');
      setSelectedItem(null);
    }
  };

  // Keyboard Shortcuts (Delete, Escape, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWallStartPoint(null);
        setMeasureStart(null);
        setActiveTool('select');
        setSelectedItem(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedItem) return;
        if (selectedItem.type === 'wall') deleteWall(selectedItem.id);
        if (selectedItem.type === 'furniture') deleteFurniture(selectedItem.id);
        if (selectedItem.type === 'opening') deleteOpening(selectedItem.id);
        if (selectedItem.type === 'stairs') deleteStaircase(selectedItem.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, deleteWall, deleteFurniture, deleteOpening, deleteStaircase, setActiveTool, setSelectedItem]);

  return (
    <div ref={containerRef} className={`relative w-full h-full select-none overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        className={`w-full h-full block outline-none ${
          isPanning ? 'cursor-grabbing' : activeTool === 'wall' ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />

      {/* Floating 2D Status Badge (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-xl text-xs text-slate-300">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-semibold text-white">Plano 2D</span>
        <span className="text-slate-500">•</span>
        <span className="font-mono text-cyan-300">
          X: {snappedMouseWorld.x.toFixed(2)}m, Y: {snappedMouseWorld.y.toFixed(2)}m
        </span>

        {lowerLevel && (
          <>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setShowUnderlayFloor(!showUnderlayFloor)}
              title="Mostrar / ocultar silueta de la planta inferior como referencia"
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                showUnderlayFloor
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>👁️ Ref. Inferior: {showUnderlayFloor ? 'ON' : 'OFF'}</span>
            </button>
          </>
        )}
      </div>

      {/* Drawing Wall Helper Bar */}
      {activeTool === 'wall' && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-full border border-cyan-500/50 shadow-2xl text-xs text-cyan-200 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>
            {wallStartPoint
              ? 'Haz clic para colocar el siguiente vértice • Clic derecho o Esc para terminar'
              : 'Haz clic en el plano para iniciar el primer muro'}
          </span>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2D CANVAS DRAWING HELPER FUNCTIONS
// ==========================================

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cx: number,
  cy: number,
  scale: number,
  gridStepMeters: number
) {
  // Minor grid lines (0.1m or gridStep)
  const minorStepPx = gridStepMeters * scale;
  const majorStepPx = 1.0 * scale; // 1 meter

  const startX = cx % minorStepPx;
  const startY = cy % minorStepPx;

  ctx.lineWidth = 1;

  // Sub-grid lines
  if (minorStepPx >= 12) {
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)'; // subtle slate
    ctx.beginPath();
    for (let x = startX; x < width; x += minorStepPx) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += minorStepPx) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  // Major 1m grid lines & coordinate labels
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.65)';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.font = '9px monospace';

  const majorStartX = cx % majorStepPx;
  const majorStartY = cy % majorStepPx;

  ctx.beginPath();
  for (let x = majorStartX; x < width; x += majorStepPx) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    const meterVal = Math.round((x - cx) / scale);
    if (meterVal !== 0 && majorStepPx > 28) {
      ctx.fillText(`${meterVal}m`, x + 3, cy - 4);
    }
  }
  for (let y = majorStartY; y < height; y += majorStepPx) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    const meterVal = Math.round((y - cy) / scale);
    if (meterVal !== 0 && majorStepPx > 28) {
      ctx.fillText(`${meterVal}m`, cx + 4, y - 3);
    }
  }
  ctx.stroke();

  // Origin Axes (X & Y in Cyan & Emerald)
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)'; // X axis
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(width, cy);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'; // Y axis
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, height);
  ctx.stroke();
}

function drawRooms(
  ctx: CanvasRenderingContext2D,
  rooms: Room[],
  w2s: (p: Point2D) => Point2D,
  selectedItem: { type: string; id: string } | null
) {
  rooms.forEach((room) => {
    if (room.polygonPoints.length < 3) return;

    const isSelected = selectedItem?.type === 'room' && selectedItem.id === room.id;

    ctx.beginPath();
    const p0 = w2s(room.polygonPoints[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < room.polygonPoints.length; i++) {
      const pi = w2s(room.polygonPoints[i]);
      ctx.lineTo(pi.x, pi.y);
    }
    ctx.closePath();

    // Floor fill with subtle tint
    ctx.fillStyle = isSelected
      ? 'rgba(59, 130, 246, 0.25)'
      : 'rgba(30, 41, 59, 0.55)';
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Centered Room Label & Area Badge
    const centroid = calculatePolygonCentroid(room.polygonPoints);
    const cSc = w2s(centroid);

    // Pill background
    const labelText = room.name || 'Habitación';
    const areaText = `${room.area} m²${room.height ? ` • h:${room.height}m` : ''}`;

    ctx.font = 'bold 11px sans-serif';
    const nameW = ctx.measureText(labelText).width;
    ctx.font = '10px monospace';
    const areaW = ctx.measureText(areaText).width;
    const totalW = Math.max(nameW, areaW) + 20;

    ctx.fillStyle = isSelected ? 'rgba(30, 58, 138, 0.85)' : 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = isSelected ? '#60a5fa' : 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cSc.x - totalW / 2, cSc.y - 18, totalW, 36, 8);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(labelText, cSc.x, cSc.y - 2);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText(areaText, cSc.x, cSc.y + 12);
  });
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  walls: Wall[],
  w2s: (p: Point2D) => Point2D,
  selectedItem: { type: string; id: string } | null,
  showDimensions: boolean
) {
  walls.forEach((wall) => {
    const isSelected = selectedItem?.type === 'wall' && selectedItem.id === wall.id;
    const p1 = w2s(wall.start);
    const p2 = w2s(wall.end);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenPx = Math.hypot(dx, dy);
    if (lenPx < 1) return;

    // Normal unit vector
    const nx = -dy / lenPx;
    const ny = dx / lenPx;

    const scale = lenPx / distance(wall.start, wall.end);
    const halfThickPx = (wall.thickness * scale) / 2;

    // 4 corners of wall polygon
    const c1 = { x: p1.x + nx * halfThickPx, y: p1.y + ny * halfThickPx };
    const c2 = { x: p2.x + nx * halfThickPx, y: p2.y + ny * halfThickPx };
    const c3 = { x: p2.x - nx * halfThickPx, y: p2.y - ny * halfThickPx };
    const c4 = { x: p1.x - nx * halfThickPx, y: p1.y - ny * halfThickPx };

    // Fill Wall Body
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.lineTo(c3.x, c3.y);
    ctx.lineTo(c4.x, c4.y);
    ctx.closePath();

    ctx.fillStyle = isSelected ? '#3b82f6' : '#cbd5e1'; // Crisp light slate
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#60a5fa' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Measurement Cota / Dimension line
    if (showDimensions) {
      const wallLenMeters = distance(wall.start, wall.end);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const tagOffset = halfThickPx + 14;
      const tagPos = { x: mid.x + nx * tagOffset, y: mid.y + ny * tagOffset };

      ctx.save();
      ctx.translate(tagPos.x, tagPos.y);

      // Auto-orient text so it's never upside down
      let angle = Math.atan2(dy, dx);
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        angle += Math.PI;
      }
      ctx.rotate(angle);

      const dimText = `${wallLenMeters.toFixed(2)} m`;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textW = ctx.measureText(dimText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(-textW / 2 - 4, -8, textW + 8, 16, 4);
      ctx.fill();

      ctx.fillStyle = isSelected ? '#93c5fd' : '#e2e8f0';
      ctx.fillText(dimText, 0, 0);

      ctx.restore();
    }
  });
}

function drawOpenings(
  ctx: CanvasRenderingContext2D,
  walls: Wall[],
  openings: Opening[],
  w2s: (p: Point2D) => Point2D,
  selectedItem: { type: string; id: string } | null
) {
  openings.forEach((op) => {
    const wall = walls.find((w) => w.id === op.wallId);
    if (!wall) return;

    const isSelected = selectedItem?.type === 'opening' && selectedItem.id === op.id;

    const wallLen = distance(wall.start, wall.end);
    const p1 = w2s(wall.start);
    const p2 = w2s(wall.end);
    const scale = Math.hypot(p2.x - p1.x, p2.y - p1.y) / wallLen;

    const opCenterM = {
      x: wall.start.x + (wall.end.x - wall.start.x) * op.distanceRatio,
      y: wall.start.y + (wall.end.y - wall.start.y) * op.distanceRatio,
    };
    const centerSc = w2s(opCenterM);

    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const opWidthPx = op.width * scale;

    ctx.save();
    ctx.translate(centerSc.x, centerSc.y);
    ctx.rotate(angle);

    if (op.type === 'door') {
      // Clear wall section
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-opWidthPx / 2, -wall.thickness * scale * 0.6, opWidthPx, wall.thickness * scale * 1.2);

      // Door Leaf
      ctx.strokeStyle = isSelected ? '#60a5fa' : '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-opWidthPx / 2, 0);
      ctx.lineTo(-opWidthPx / 2, -opWidthPx);
      ctx.stroke();

      // Swing Arc
      ctx.strokeStyle = isSelected ? 'rgba(96, 165, 250, 0.6)' : 'rgba(148, 163, 184, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(-opWidthPx / 2, 0, opWidthPx, -Math.PI / 2, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Window: Clear wall and draw double glass line
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-opWidthPx / 2, -wall.thickness * scale * 0.6, opWidthPx, wall.thickness * scale * 1.2);

      ctx.strokeStyle = isSelected ? '#38bdf8' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-opWidthPx / 2, -3);
      ctx.lineTo(opWidthPx / 2, -3);
      ctx.moveTo(-opWidthPx / 2, 3);
      ctx.lineTo(opWidthPx / 2, 3);
      ctx.stroke();

      // Frame ends
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(-opWidthPx / 2, -wall.thickness * scale * 0.4);
      ctx.lineTo(-opWidthPx / 2, wall.thickness * scale * 0.4);
      ctx.moveTo(opWidthPx / 2, -wall.thickness * scale * 0.4);
      ctx.lineTo(opWidthPx / 2, wall.thickness * scale * 0.4);
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  furniture: FurnitureItem[],
  w2s: (p: Point2D) => Point2D,
  scale: number,
  selectedItem: { type: string; id: string } | null
) {
  furniture.forEach((f) => {
    const isSelected = selectedItem?.type === 'furniture' && selectedItem.id === f.id;
    const centerSc = w2s({ x: f.x, y: f.y });

    const wPx = f.width * scale;
    const dPx = f.depth * scale;

    ctx.save();
    ctx.translate(centerSc.x, centerSc.y);
    ctx.rotate((f.rotation * Math.PI) / 180);

    // Furniture body
    ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.4)' : (f.color ? `${f.color}bb` : 'rgba(51, 65, 85, 0.8)');
    ctx.strokeStyle = isSelected ? '#60a5fa' : '#94a3b8';
    ctx.lineWidth = isSelected ? 2 : 1.2;

    ctx.beginPath();
    ctx.roundRect(-wPx / 2, -dPx / 2, wPx, dPx, 4);
    ctx.fill();
    ctx.stroke();

    // Architectural top-down iconography
    if (f.category === 'bedroom') {
      // Bed pillows
      ctx.fillStyle = '#ffffff';
      const pilW = wPx * 0.38;
      const pilH = dPx * 0.22;
      ctx.fillRect(-wPx / 2 + 4, -dPx / 2 + 4, pilW, pilH);
      ctx.fillRect(wPx / 2 - pilW - 4, -dPx / 2 + 4, pilW, pilH);
    } else if (f.catalogId === 'sofa_modern') {
      // Sofa cushions
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(-wPx / 2 + 6, -dPx / 2 + 6, wPx - 12, dPx * 0.3);
    }

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.name.split(' ')[0], 0, 0);

    ctx.restore();
  });
}

function drawToolPreview(
  ctx: CanvasRenderingContext2D,
  tool: string,
  wallStart: Point2D | null,
  mouseWorld: Point2D,
  walls: Wall[],
  catalogId: string | null,
  stairType: string,
  w2s: (p: Point2D) => Point2D,
  scale: number,
  measureStart: Point2D | null
) {
  // 1. Wall preview
  if (tool === 'wall') {
    const mouseSc = w2s(mouseWorld);

    // Vertex snap target indicator
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mouseSc.x, mouseSc.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (wallStart) {
      const startSc = w2s(wallStart);
      const wallLen = distance(wallStart, mouseWorld);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(startSc.x, startSc.y);
      ctx.lineTo(mouseSc.x, mouseSc.y);
      ctx.stroke();

      // Dimension badge on wall preview
      const mid = { x: (startSc.x + mouseSc.x) / 2, y: (startSc.y + mouseSc.y) / 2 };
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.roundRect(mid.x - 28, mid.y - 12, 56, 22, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${wallLen.toFixed(2)} m`, mid.x, mid.y);
    }
  }

  // 2. Door/Window placement preview
  if (tool === 'door' || tool === 'window') {
    const match = findNearestWall(mouseWorld, walls, 0.8);
    if (match) {
      const matchSc = w2s(match.point);
      ctx.fillStyle = tool === 'door' ? '#f59e0b' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(matchSc.x, matchSc.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Colocar ${tool === 'door' ? 'Puerta' : 'Ventana'}`, matchSc.x + 10, matchSc.y - 10);
    }
  }

  // 3. Furniture placement footprint preview
  if (tool === 'furniture') {
    const catItem = FURNITURE_CATALOG.find((c) => c.id === catalogId) || FURNITURE_CATALOG[0];
    const mouseSc = w2s(mouseWorld);
    const wPx = catItem.width * scale;
    const dPx = catItem.depth * scale;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.roundRect(mouseSc.x - wPx / 2, mouseSc.y - dPx / 2, wPx, dPx, 4);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 3.5. Stairs placement footprint preview
  if (tool === 'stairs') {
    const mouseSc = w2s(mouseWorld);
    const wPx = 0.95 * scale;
    const lPx = 2.8 * scale;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.roundRect(mouseSc.x - wPx / 2, mouseSc.y - lPx / 2, wPx, lPx, 4);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Colocar Escalera', mouseSc.x, mouseSc.y);
  }

  // 4. Measure tool preview
  if (tool === 'measure' && measureStart) {
    const startSc = w2s(measureStart);
    const mouseSc = w2s(mouseWorld);
    const d = distance(measureStart, mouseWorld);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(startSc.x, startSc.y);
    ctx.lineTo(mouseSc.x, mouseSc.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const mid = { x: (startSc.x + mouseSc.x) / 2, y: (startSc.y + mouseSc.y) / 2 };
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.roundRect(mid.x - 30, mid.y - 12, 60, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${d.toFixed(2)} m`, mid.x, mid.y);
  }
}

function drawSelectionGizmos(
  ctx: CanvasRenderingContext2D,
  selectedItem: { type: string; id: string } | null,
  activeLevel: { walls: Wall[]; furniture: FurnitureItem[]; staircases?: any[] },
  w2s: (p: Point2D) => Point2D,
  scale: number
) {
  if (!selectedItem) return;

  // Selected Wall: Render Vertex Handles
  if (selectedItem.type === 'wall') {
    const wall = activeLevel.walls.find((w) => w.id === selectedItem.id);
    if (!wall) return;
    const sSc = w2s(wall.start);
    const eSc = w2s(wall.end);

    [sSc, eSc].forEach((pt) => {
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // Selected Furniture: Render Bounding Box and Rotation Handle
  if (selectedItem.type === 'furniture') {
    const f = activeLevel.furniture.find((item) => item.id === selectedItem.id);
    if (!f) return;
    const centerSc = w2s({ x: f.x, y: f.y });

    ctx.save();
    ctx.translate(centerSc.x, centerSc.y);
    ctx.rotate((f.rotation * Math.PI) / 180);

    const wPx = f.width * scale;
    const dPx = f.depth * scale;

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-wPx / 2 - 4, -dPx / 2 - 4, wPx + 8, dPx + 8);
    ctx.setLineDash([]);

    const rotDist = dPx / 2 + 22;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -dPx / 2 - 4);
    ctx.lineTo(0, -rotDist);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -rotDist, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // Selected Stairs: Render Bounding Box and Rotation Handle
  if (selectedItem.type === 'stairs') {
    const st = (activeLevel.staircases || []).find((item) => item.id === selectedItem.id);
    if (!st) return;
    const centerSc = w2s({ x: st.x, y: st.y });

    ctx.save();
    ctx.translate(centerSc.x, centerSc.y);
    ctx.rotate((st.rotation * Math.PI) / 180);

    const wPx = st.width * scale;
    const lPx = st.length * scale;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-wPx / 2 - 4, -lPx / 2 - 4, wPx + 8, lPx + 8);
    ctx.setLineDash([]);

    const rotDist = lPx / 2 + 22;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -lPx / 2 - 4);
    ctx.lineTo(0, -rotDist);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -rotDist, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

function drawUnderlayFloor(
  ctx: CanvasRenderingContext2D,
  lowerLevel: any,
  w2s: (p: Point2D) => Point2D
) {
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)'; // Blueprint glowing cyan
  ctx.lineWidth = 1.5;

  // Draw lower walls as blueprint reference
  lowerLevel.walls.forEach((w: Wall) => {
    const p1 = w2s(w.start);
    const p2 = w2s(w.end);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });

  // Draw lower staircases as reference
  (lowerLevel.staircases || []).forEach((stair: any) => {
    const sc = w2s({ x: stair.x, y: stair.y });
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.fillRect(sc.x - 25, sc.y - 40, 50, 80);
    ctx.strokeRect(sc.x - 25, sc.y - 40, 50, 80);
  });

  ctx.restore();
}

function drawStaircases(
  ctx: CanvasRenderingContext2D,
  staircases: any[],
  w2s: (p: Point2D) => Point2D,
  scale: number,
  selectedItem: { type: string; id: string } | null
) {
  staircases.forEach((stair) => {
    const isSelected = selectedItem?.type === 'stairs' && selectedItem.id === stair.id;
    const centerSc = w2s({ x: stair.x, y: stair.y });
    const wPx = stair.width * scale;
    const lPx = stair.length * scale;

    ctx.save();
    ctx.translate(centerSc.x, centerSc.y);
    ctx.rotate((stair.rotation * Math.PI) / 180);

    // Outer staircase boundary
    ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.35)' : 'rgba(30, 41, 59, 0.75)';
    ctx.strokeStyle = isSelected ? '#60a5fa' : '#38bdf8';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;

    ctx.beginPath();
    ctx.roundRect(-wPx / 2, -lPx / 2, wPx, lPx, 4);
    ctx.fill();
    ctx.stroke();

    // Individual Step Treads (Huellas)
    const stepCount = stair.stepCount || 14;
    const stepDepthPx = lPx / stepCount;

    ctx.strokeStyle = isSelected ? '#93c5fd' : '#94a3b8';
    ctx.lineWidth = 1;
    for (let i = 1; i < stepCount; i++) {
      const y = -lPx / 2 + i * stepDepthPx;
      ctx.beginPath();
      ctx.moveTo(-wPx / 2, y);
      ctx.lineTo(wPx / 2, y);
      ctx.stroke();
    }

    // Direction Arrow pointing UP with "SUBE"
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, lPx / 2 - 12);
    ctx.lineTo(0, -lPx / 2 + 16);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(0, -lPx / 2 + 8);
    ctx.lineTo(-6, -lPx / 2 + 20);
    ctx.lineTo(6, -lPx / 2 + 20);
    ctx.closePath();
    ctx.fill();

    // Start circle at bottom
    ctx.beginPath();
    ctx.arc(0, lPx / 2 - 12, 4, 0, Math.PI * 2);
    ctx.fill();

    // Text badge "SUBE"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUBE', 0, 4);

    ctx.restore();
  });
}
