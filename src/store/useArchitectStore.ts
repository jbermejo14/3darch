import { create } from 'zustand';
import { 
  Project, 
  Level, 
  Wall, 
  Room, 
  Opening, 
  FurnitureItem, 
  ToolMode, 
  ViewMode, 
  CameraMode, 
  SelectedItem, 
  Point2D,
  FloorTextureType
} from '../types/architectural';
import { createDefaultProject } from './defaultProject';
import { detectClosedRoomsFromWalls, calculatePolygonArea } from '../utils/geometry2d';
import { FURNITURE_CATALOG } from './furnitureCatalog';

interface ArchitectState {
  // Project & Data
  project: Project;
  activeLevelId: string;
  
  // History for Undo / Redo
  undoStack: Project[];
  redoStack: Project[];

  // Editor / UI State
  viewMode: ViewMode;
  activeTool: ToolMode;
  selectedItem: SelectedItem | null;
  selectedCatalogItemId: string | null;
  
  // 2D Viewport Options
  gridSnap: boolean;
  gridSize: number; // in meters (e.g. 0.25, 0.5)
  angleSnap: boolean;
  showDimensions: boolean;
  showUnderlayFloor: boolean; // Ghost reference of floor below in 2D
  zoom: number;
  pan: Point2D;
  cursorWorldPos: Point2D;

  // 3D Viewport Options
  showCeilings: boolean;
  wallDisplayMode: 'full' | 'low' | 'hidden'; // 'full' = normal, 'low' = 0.85m cutaway, 'hidden' = view without walls
  cameraMode: CameraMode;
  showAllLevelsIn3D: boolean;
  explodedViewOffset: number; // 0 to 4 meters vertical gap between floors in 3D
  selectedStaircaseType: 'straight' | 'l_shaped' | 'spiral';

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: ToolMode) => void;
  setSelectedItem: (item: SelectedItem | null) => void;
  setSelectedCatalogItemId: (id: string | null) => void;
  setSelectedStaircaseType: (type: 'straight' | 'l_shaped' | 'spiral') => void;
  setGridSnap: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  setAngleSnap: (snap: boolean) => void;
  setShowDimensions: (show: boolean) => void;
  setShowUnderlayFloor: (show: boolean) => void;
  setShowCeilings: (show: boolean) => void;
  setWallDisplayMode: (mode: 'full' | 'low' | 'hidden') => void;
  setShowAllLevelsIn3D: (show: boolean) => void;
  setExplodedViewOffset: (offset: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: Point2D | ((prev: Point2D) => Point2D)) => void;
  setCursorWorldPos: (pos: Point2D) => void;

  // History Actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Project & Level Actions
  setProjectName: (name: string) => void;
  setActiveLevel: (levelId: string) => void;
  addLevel: (name?: string) => void;
  duplicateCurrentLevel: () => void;
  createUpperFloorFromCurrent: () => void;
  deleteLevel: (levelId: string) => void;
  updateLevel: (levelId: string, partial: Partial<Level>) => void;
  importProject: (project: Project) => void;
  resetToDefaultProject: () => void;
  newEmptyProject: () => void;

  // Wall Actions
  addWall: (start: Point2D, end: Point2D, thickness?: number, height?: number) => string;
  updateWall: (id: string, partial: Partial<Wall>) => void;
  deleteWall: (id: string) => void;

  // Room Actions
  addRoom: (name: string, polygonPoints: Point2D[], floorTexture?: FloorTextureType, floorColor?: string) => string;
  updateRoom: (id: string, partial: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  autoDetectRooms: () => void;

  // Opening Actions
  addOpening: (wallId: string, type: 'door' | 'window', distanceRatio: number, width?: number, height?: number, elevation?: number) => string;
  updateOpening: (id: string, partial: Partial<Opening>) => void;
  deleteOpening: (id: string) => void;

  // Staircase Actions
  addStaircase: (type?: 'straight' | 'l_shaped' | 'spiral', x?: number, y?: number, rotation?: number, width?: number, length?: number, height?: number, hasRailing?: boolean) => string;
  updateStaircase: (id: string, partial: Partial<any>) => void;
  deleteStaircase: (id: string) => void;

  // Furniture Actions
  addFurniture: (catalogId: string, x: number, y: number, rotation?: number) => string;
  updateFurniture: (id: string, partial: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;

  // Helper getters
  getActiveLevel: () => Level;
  getLowerLevel: () => Level | null;
}

export const useArchitectStore = create<ArchitectState>((set, get) => {
  const defaultProj = createDefaultProject();

  return {
    project: defaultProj,
    activeLevelId: defaultProj.activeLevelId,
    undoStack: [],
    redoStack: [],

    viewMode: 'split',
    activeTool: 'select',
    selectedItem: null,
    selectedCatalogItemId: 'sofa_modern',

    gridSnap: true,
    gridSize: 0.25,
    angleSnap: true,
    showDimensions: true,
    showUnderlayFloor: true,
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    cursorWorldPos: { x: 0, y: 0 },

    showCeilings: false,
    wallDisplayMode: 'full',
    cameraMode: 'orbit',
    showAllLevelsIn3D: true,
    explodedViewOffset: 0,
    selectedStaircaseType: 'straight',

    setViewMode: (mode) => set({ viewMode: mode }),
    setActiveTool: (tool) => set({ activeTool: tool }),
    setSelectedItem: (item) => set({ selectedItem: item }),
    setSelectedCatalogItemId: (id) => set({ selectedCatalogItemId: id }),
    setSelectedStaircaseType: (type) => set({ selectedStaircaseType: type }),
    setGridSnap: (snap) => set({ gridSnap: snap }),
    setGridSize: (size) => set({ gridSize: size }),
    setAngleSnap: (snap) => set({ angleSnap: snap }),
    setShowDimensions: (show) => set({ showDimensions: show }),
    setShowUnderlayFloor: (show) => set({ showUnderlayFloor: show }),
    setShowCeilings: (show) => set({ showCeilings: show }),
    setWallDisplayMode: (mode) => set({ wallDisplayMode: mode }),
    setShowAllLevelsIn3D: (show) => set({ showAllLevelsIn3D: show }),
    setExplodedViewOffset: (offset) => set({ explodedViewOffset: offset }),
    setCameraMode: (mode) => set({ cameraMode: mode }),
    setZoom: (zoom) => set((s) => ({ zoom: typeof zoom === 'function' ? zoom(s.zoom) : zoom })),
    setPan: (pan) => set((s) => ({ pan: typeof pan === 'function' ? pan(s.pan) : pan })),
    setCursorWorldPos: (pos) => set({ cursorWorldPos: pos }),

    pushHistory: () => {
      const current = JSON.parse(JSON.stringify(get().project));
      set((s) => ({
        undoStack: [...s.undoStack.slice(-25), current],
        redoStack: [],
      }));
    },

    undo: () => {
      const { undoStack, project, redoStack } = get();
      if (undoStack.length === 0) return;
      const previous = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, -1);
      const current = JSON.parse(JSON.stringify(project));

      set({
        project: previous,
        activeLevelId: previous.levels.some(l => l.id === previous.activeLevelId) ? previous.activeLevelId : previous.levels[0].id,
        undoStack: newUndo,
        redoStack: [current, ...redoStack],
        selectedItem: null,
      });
    },

    redo: () => {
      const { redoStack, project, undoStack } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[0];
      const newRedo = redoStack.slice(1);
      const current = JSON.parse(JSON.stringify(project));

      set({
        project: next,
        activeLevelId: next.levels.some(l => l.id === next.activeLevelId) ? next.activeLevelId : next.levels[0].id,
        undoStack: [...undoStack, current],
        redoStack: newRedo,
        selectedItem: null,
      });
    },

    setProjectName: (name) => {
      get().pushHistory();
      set((s) => ({
        project: { ...s.project, name },
      }));
    },

    setActiveLevel: (levelId) => {
      set({ activeLevelId: levelId, selectedItem: null });
    },

    addLevel: (name) => {
      get().pushHistory();
      const { project } = get();
      const count = project.levels.length;
      const newAltitude = count * 2.8;
      const newLevelId = `level_${Date.now()}`;
      const newLevel: Level = {
        id: newLevelId,
        name: name || `Planta ${count}`,
        altitude: newAltitude,
        wallHeight: 2.6,
        wallThickness: 0.18,
        walls: [],
        rooms: [],
        openings: [],
        furniture: [],
      };

      set({
        project: {
          ...project,
          levels: [...project.levels, newLevel],
          activeLevelId: newLevelId,
        },
        activeLevelId: newLevelId,
        selectedItem: null,
      });
    },

    duplicateCurrentLevel: () => {
      get().pushHistory();
      const current = get().getActiveLevel();
      const count = get().project.levels.length;
      const newLevelId = `level_${Date.now()}`;
      const clonedLevel: Level = {
        ...JSON.parse(JSON.stringify(current)),
        id: newLevelId,
        name: `${current.name} (Copia)`,
        altitude: (count) * 2.8,
      };

      set((s) => ({
        project: {
          ...s.project,
          levels: [...s.project.levels, clonedLevel],
          activeLevelId: newLevelId,
        },
        activeLevelId: newLevelId,
        selectedItem: null,
      }));
    },

    createUpperFloorFromCurrent: () => {
      get().pushHistory();
      const current = get().getActiveLevel();
      const { project } = get();
      const count = project.levels.length;
      const newLevelId = `level_${Date.now()}`;
      const newAltitude = Number((current.altitude + (current.wallHeight || 2.6)).toFixed(2));

      // Clone exterior perimeter walls
      const clonedWalls = current.walls.map((w) => ({
        ...JSON.parse(JSON.stringify(w)),
        id: `w_up_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      }));

      // Ensure lower level has stairs connecting upwards
      const hasStairs = current.staircases && current.staircases.length > 0;
      let updatedLevels = project.levels;
      if (!hasStairs) {
        const newStair = {
          id: `stair_${Date.now()}`,
          type: 'straight' as const,
          x: 1.0,
          y: 0.5,
          rotation: 0,
          width: 0.95,
          length: 2.8,
          height: Number((current.wallHeight || 2.6).toFixed(2)),
          stepCount: 14,
          hasRailing: false,
        };
        updatedLevels = updatedLevels.map((lvl) =>
          lvl.id === current.id
            ? { ...lvl, staircases: [...(lvl.staircases || []), newStair] }
            : lvl
        );
      }

      // Clone first room or create spacious master suite floor
      const upperRooms = current.rooms.length > 0
        ? current.rooms.map((r, idx) => ({
            ...JSON.parse(JSON.stringify(r)),
            id: `room_up_${Date.now()}_${idx}`,
            name: idx === 0 ? 'Suite Principal (P1)' : `Estancia ${idx + 1} (P1)`,
            floorTexture: 'wood' as const,
          }))
        : [];

      const upperLevel: Level = {
        id: newLevelId,
        name: `Planta ${count} (Planta Alta)`,
        altitude: newAltitude,
        wallHeight: 2.6,
        wallThickness: current.wallThickness || 0.18,
        walls: clonedWalls,
        rooms: upperRooms,
        openings: [
          {
            id: `op_up_win_${Date.now()}`,
            wallId: clonedWalls[0]?.id || '',
            type: 'window',
            distanceRatio: 0.5,
            width: 1.8,
            height: 1.4,
            elevation: 0.8,
            style: 'single',
          }
        ],
        furniture: [
          {
            id: `f_up_bed_${Date.now()}`,
            catalogId: 'bed_king',
            name: 'Cama Suite Principal',
            category: 'bedroom',
            x: 2.4,
            y: -1.2,
            rotation: 0,
            width: 1.9,
            depth: 2.1,
            height: 0.95,
            color: '#1e3a8a',
          }
        ],
        staircases: [],
      };

      set({
        project: {
          ...project,
          levels: [...updatedLevels, upperLevel],
          activeLevelId: newLevelId,
        },
        activeLevelId: newLevelId,
        selectedItem: null,
        showAllLevelsIn3D: true,
      });
    },

    deleteLevel: (levelId) => {
      const { project } = get();
      if (project.levels.length <= 1) return; // Keep at least one level
      get().pushHistory();
      const newLevels = project.levels.filter((l) => l.id !== levelId);
      const nextActive = newLevels[0].id;

      set({
        project: {
          ...project,
          levels: newLevels,
          activeLevelId: nextActive,
        },
        activeLevelId: nextActive,
        selectedItem: null,
      });
    },

    updateLevel: (levelId, partial) => {
      get().pushHistory();
      set((s) => {
        let updatedLevels = s.project.levels.map((l) => (l.id === levelId ? { ...l, ...partial } : l));

        if (partial.wallHeight !== undefined) {
          const newH = partial.wallHeight;
          updatedLevels = updatedLevels.map((l) => {
            if (l.id === levelId) {
              return {
                ...l,
                wallHeight: newH,
                walls: l.walls.map((w) => ({ ...w, height: newH })),
                rooms: l.rooms.map((r) => ({ ...r, height: newH })),
                staircases: (l.staircases || []).map((st) => ({
                  ...st,
                  height: Number(newH.toFixed(2)),
                  stepCount: Math.max(14, Math.round(newH / 0.18)),
                  hasRailing: false,
                })),
              };
            }
            return l;
          });

          // Cascade cumulative altitude across all levels so floors sit flush on top of walls
          let currentAlt = 0;
          updatedLevels = updatedLevels.map((lvl) => {
            const lvlAlt = currentAlt;
            const floorH = lvl.wallHeight || 2.6;
            currentAlt = Number((currentAlt + floorH).toFixed(2));
            return { ...lvl, altitude: lvlAlt };
          });
        } else if (partial.altitude !== undefined) {
          // If altitude of an upper floor is set, adjust lower floor's wallHeight so walls reach the floor without void
          const targetIdx = updatedLevels.findIndex((l) => l.id === levelId);
          if (targetIdx > 0) {
            const prevLvl = updatedLevels[targetIdx - 1];
            const neededH = Math.max(2.0, Number((partial.altitude - prevLvl.altitude).toFixed(2)));
            updatedLevels = updatedLevels.map((l, idx) => {
              if (idx === targetIdx - 1) {
                return {
                  ...l,
                  wallHeight: neededH,
                  walls: l.walls.map((w) => ({ ...w, height: neededH })),
                  rooms: l.rooms.map((r) => ({ ...r, height: neededH })),
                  staircases: (l.staircases || []).map((st) => ({
                    ...st,
                    height: neededH,
                    stepCount: Math.max(14, Math.round(neededH / 0.18)),
                  })),
                };
              }
              return l;
            });
          }
        }

        return {
          project: {
            ...s.project,
            levels: updatedLevels,
          },
        };
      });
    },

    importProject: (imported) => {
      if (!imported || !imported.levels || imported.levels.length === 0) return;
      get().pushHistory();
      set({
        project: imported,
        activeLevelId: imported.activeLevelId || imported.levels[0].id,
        selectedItem: null,
      });
    },

    resetToDefaultProject: () => {
      get().pushHistory();
      const def = createDefaultProject();
      set({
        project: def,
        activeLevelId: def.activeLevelId,
        selectedItem: null,
      });
    },

    newEmptyProject: () => {
      get().pushHistory();
      const emptyLevel: Level = {
        id: 'level_0',
        name: 'Planta Baja',
        altitude: 0,
        wallHeight: 2.6,
        wallThickness: 0.18,
        walls: [],
        rooms: [],
        openings: [],
        furniture: [],
      };
      const emptyProj: Project = {
        id: `proj_${Date.now()}`,
        name: 'Nuevo Proyecto',
        unit: 'm',
        activeLevelId: 'level_0',
        levels: [emptyLevel],
      };
      set({
        project: emptyProj,
        activeLevelId: 'level_0',
        selectedItem: null,
      });
    },

    // Wall Actions
    addWall: (start, end, thickness, height) => {
      get().pushHistory();
      const level = get().getActiveLevel();
      const id = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newWall: Wall = {
        id,
        start,
        end,
        thickness: thickness ?? level.wallThickness ?? 0.18,
        height: height ?? level.wallHeight ?? 2.6,
        color: '#f8fafc',
      };

      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? { ...l, walls: [...l.walls, newWall] }
              : l
          ),
        },
      }));

      // Try auto room detection
      setTimeout(() => {
        get().autoDetectRooms();
      }, 50);

      return id;
    },

    updateWall: (id, partial) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  walls: l.walls.map((w) => (w.id === id ? { ...w, ...partial } : w)),
                }
              : l
          ),
        },
      }));
    },

    deleteWall: (id) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  walls: l.walls.filter((w) => w.id !== id),
                  openings: l.openings.filter((op) => op.wallId !== id),
                }
              : l
          ),
        },
        selectedItem: s.selectedItem?.id === id ? null : s.selectedItem,
      }));
    },

    // Room Actions
    addRoom: (name, polygonPoints, floorTexture = 'wood', floorColor = '#c49a6c') => {
      get().pushHistory();
      const id = `room_${Date.now()}`;
      const area = calculatePolygonArea(polygonPoints);
      const newRoom: Room = {
        id,
        name,
        polygonPoints,
        floorColor,
        floorTexture,
        ceilingVisible: false,
        area: Number(area.toFixed(2)),
      };

      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? { ...l, rooms: [...l.rooms, newRoom] }
              : l
          ),
        },
      }));

      return id;
    },

    updateRoom: (id, partial) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  rooms: l.rooms.map((r) => (r.id === id ? { ...r, ...partial } : r)),
                }
              : l
          ),
        },
      }));
    },

    deleteRoom: (id) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  rooms: l.rooms.filter((r) => r.id !== id),
                }
              : l
          ),
        },
        selectedItem: s.selectedItem?.id === id ? null : s.selectedItem,
      }));
    },

    autoDetectRooms: () => {
      const level = get().getActiveLevel();
      const detectedPolygons = detectClosedRoomsFromWalls(level.walls);
      if (detectedPolygons.length === 0) return;

      const existingRooms = [...level.rooms];
      let addedAny = false;

      detectedPolygons.forEach((poly, idx) => {
        const area = Number(calculatePolygonArea(poly).toFixed(2));
        // Check if there's already a room covering roughly this area
        const alreadyExists = existingRooms.some((r) => Math.abs(r.area - area) < 0.25);
        if (!alreadyExists) {
          const roomNames = ['Estancia', 'Habitación', 'Espacio', 'Salón', 'Zona Abierta'];
          const newRoom: Room = {
            id: `room_${Date.now()}_${idx}`,
            name: `${roomNames[existingRooms.length % roomNames.length]} ${existingRooms.length + 1}`,
            polygonPoints: poly,
            floorColor: '#d4b896',
            floorTexture: 'parquet',
            ceilingVisible: false,
            area,
          };
          existingRooms.push(newRoom);
          addedAny = true;
        }
      });

      if (addedAny) {
        set((s) => ({
          project: {
            ...s.project,
            levels: s.project.levels.map((l) =>
              l.id === s.activeLevelId
                ? { ...l, rooms: existingRooms }
                : l
            ),
          },
        }));
      }
    },

    // Opening Actions
    addOpening: (wallId, type, distanceRatio, width, height, elevation) => {
      get().pushHistory();
      const id = `op_${Date.now()}`;
      const defaultW = type === 'door' ? 0.9 : 1.4;
      const defaultH = type === 'door' ? 2.1 : 1.2;
      const defaultElev = type === 'door' ? 0 : 0.9;

      const newOp: Opening = {
        id,
        wallId,
        type,
        distanceRatio: Math.max(0.1, Math.min(0.9, distanceRatio)),
        width: width ?? defaultW,
        height: height ?? defaultH,
        elevation: elevation ?? defaultElev,
        style: 'single',
      };

      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? { ...l, openings: [...l.openings, newOp] }
              : l
          ),
        },
        selectedItem: { type: 'opening', id },
      }));

      return id;
    },

    updateOpening: (id, partial) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  openings: l.openings.map((op) => (op.id === id ? { ...op, ...partial } : op)),
                }
              : l
          ),
        },
      }));
    },

    deleteOpening: (id) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  openings: l.openings.filter((op) => op.id !== id),
                }
              : l
          ),
        },
        selectedItem: s.selectedItem?.id === id ? null : s.selectedItem,
      }));
    },

    // Furniture Actions
    addFurniture: (catalogId, x, y, rotation = 0) => {
      get().pushHistory();
      const def = FURNITURE_CATALOG.find((c) => c.id === catalogId) || FURNITURE_CATALOG[0];
      const id = `f_${Date.now()}`;

      const newItem: FurnitureItem = {
        id,
        catalogId: def.id,
        name: def.name,
        category: def.category,
        x,
        y,
        rotation,
        width: def.width,
        depth: def.depth,
        height: def.height,
        color: def.color,
      };

      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? { ...l, furniture: [...l.furniture, newItem] }
              : l
          ),
        },
        selectedItem: { type: 'furniture', id },
      }));

      return id;
    },

    updateFurniture: (id, partial) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  furniture: l.furniture.map((f) => (f.id === id ? { ...f, ...partial } : f)),
                }
              : l
          ),
        },
      }));
    },

    deleteFurniture: (id) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  furniture: l.furniture.filter((f) => f.id !== id),
                }
              : l
          ),
        },
        selectedItem: s.selectedItem?.id === id ? null : s.selectedItem,
      }));
    },

    // Staircase Actions
    addStaircase: (type = 'straight', x = 0, y = 0, rotation = 0, width = 0.95, length = 2.8, height = 2.8, hasRailing = true) => {
      get().pushHistory();
      const id = `stair_${Date.now()}`;
      const newStair: any = {
        id,
        type,
        x,
        y,
        rotation,
        width,
        length,
        height,
        stepCount: 14,
        hasRailing,
        color: '#c89d66',
      };

      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? { ...l, staircases: [...(l.staircases || []), newStair] }
              : l
          ),
        },
        selectedItem: { type: 'stairs', id },
      }));

      return id;
    },

    updateStaircase: (id, partial) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  staircases: (l.staircases || []).map((st) => (st.id === id ? { ...st, ...partial } : st)),
                }
              : l
          ),
        },
      }));
    },

    deleteStaircase: (id) => {
      get().pushHistory();
      set((s) => ({
        project: {
          ...s.project,
          levels: s.project.levels.map((l) =>
            l.id === s.activeLevelId
              ? {
                  ...l,
                  staircases: (l.staircases || []).filter((st) => st.id !== id),
                }
              : l
          ),
        },
        selectedItem: s.selectedItem?.id === id ? null : s.selectedItem,
      }));
    },

    getActiveLevel: () => {
      const { project, activeLevelId } = get();
      return project.levels.find((l) => l.id === activeLevelId) || project.levels[0];
    },

    getLowerLevel: () => {
      const { project, activeLevelId } = get();
      const currentIndex = project.levels.findIndex((l) => l.id === activeLevelId);
      if (currentIndex > 0) {
        return project.levels[currentIndex - 1];
      }
      return null;
    },
  };
});
