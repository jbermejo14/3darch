export type Unit = 'm' | 'ft';

export interface Point2D {
  x: number;
  y: number;
}

export type ToolMode = 
  | 'select' 
  | 'wall' 
  | 'door' 
  | 'window' 
  | 'stairs'
  | 'furniture' 
  | 'room' 
  | 'measure' 
  | 'pan';

export type ViewMode = '2d' | '3d' | 'split';

export type CameraMode = 'orbit' | 'firstPerson' | 'topDown';

export type OpeningType = 'door' | 'window';

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  distanceRatio: number; // 0 to 1 along the wall
  width: number; // in meters (e.g. 0.9m)
  height: number; // in meters (e.g. 2.1m)
  elevation: number; // in meters from floor (0 for door, 0.9 for window)
  style?: string; // 'single' | 'double' | 'sliding'
}

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number; // in meters (e.g. 0.15m or 0.20m)
  height: number; // in meters (e.g. 2.6m)
  color?: string;
  texture?: string;
}

export type FloorTextureType = 'wood' | 'tiles' | 'marble' | 'carpet' | 'concrete' | 'parquet';

export interface Room {
  id: string;
  name: string;
  polygonPoints: Point2D[];
  floorColor: string;
  floorTexture: FloorTextureType;
  ceilingVisible: boolean;
  area: number; // calculated in m^2
  height?: number; // Custom room / ceiling height in meters (e.g. 2.6m, 3.2m, 4.0m)
}

export type FurnitureCategory = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'decor';

export interface FurnitureItem {
  id: string;
  catalogId: string;
  name: string;
  category: FurnitureCategory;
  x: number; // meters in 2D plane (X in 3D)
  y: number; // meters in 2D plane (Z in 3D)
  rotation: number; // in degrees
  width: number; // meters
  depth: number; // meters
  height: number; // meters
  color: string;
  material?: string;
}

export type StaircaseType = 'straight' | 'l_shaped' | 'spiral';

export interface Staircase {
  id: string;
  type: StaircaseType;
  x: number; // meters in 2D plane (center or start)
  y: number; // meters in 2D plane
  rotation: number; // degrees
  width: number; // width of steps in meters (default 0.95m)
  length: number; // run/length of stairs in meters (default 2.8m)
  height: number; // vertical rise (default 2.8m)
  stepCount: number; // number of steps (default 14)
  hasRailing: boolean;
  color?: string;
}

export interface Level {
  id: string;
  name: string;
  altitude: number; // height offset in meters (0 for ground floor)
  wallHeight: number; // standard height of walls for this level (e.g. 2.6m)
  wallThickness: number; // default wall thickness (e.g. 0.15m)
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  furniture: FurnitureItem[];
  staircases?: Staircase[];
}

export interface Project {
  id: string;
  name: string;
  unit: Unit;
  levels: Level[];
  activeLevelId: string;
}

export type SelectedItemType = 'wall' | 'room' | 'opening' | 'furniture' | 'stairs' | 'level';

export interface SelectedItem {
  type: SelectedItemType;
  id: string;
}

export interface FurnitureCatalogDefinition {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  color: string;
  iconName: string;
}
