import React from 'react';
import { useArchitectStore } from '../../store/useArchitectStore';
import { 
  Grid, 
  Magnet, 
  Ruler, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const BottomStatusBar: React.FC = () => {
  const gridSnap = useArchitectStore((s) => s.gridSnap);
  const setGridSnap = useArchitectStore((s) => s.setGridSnap);
  const gridSize = useArchitectStore((s) => s.gridSize);
  const setGridSize = useArchitectStore((s) => s.setGridSize);
  const angleSnap = useArchitectStore((s) => s.angleSnap);
  const setAngleSnap = useArchitectStore((s) => s.setAngleSnap);
  const showDimensions = useArchitectStore((s) => s.showDimensions);
  const setShowDimensions = useArchitectStore((s) => s.setShowDimensions);
  const zoom = useArchitectStore((s) => s.zoom);
  const setZoom = useArchitectStore((s) => s.setZoom);
  const setPan = useArchitectStore((s) => s.setPan);
  const cursorWorldPos = useArchitectStore((s) => s.cursorWorldPos);

  const project = useArchitectStore((s) => s.project);
  const activeLevelId = useArchitectStore((s) => s.activeLevelId);
  const activeLevel = project.levels.find((l) => l.id === activeLevelId) || project.levels[0];
  const totalArea = activeLevel.rooms.reduce((acc, r) => acc + r.area, 0).toFixed(1);

  return (
    <footer className="h-9 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between select-none z-20 text-[11px] text-slate-400">
      {/* Left: Snap & Dimension Toggles */}
      <div className="flex items-center gap-2">
        {/* Grid Snap Toggle */}
        <button
          onClick={() => setGridSnap(!gridSnap)}
          title="Ajuste a la Cuadrícula (Snap to Grid)"
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            gridSnap
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold'
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap Cuadrícula</span>
        </button>

        {/* Grid Size Selector */}
        {gridSnap && (
          <select
            value={gridSize}
            onChange={(e) => setGridSize(parseFloat(e.target.value))}
            className="bg-slate-950 text-slate-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-800 outline-none"
          >
            <option value="0.1">0.10 m (10 cm)</option>
            <option value="0.25">0.25 m (25 cm)</option>
            <option value="0.5">0.50 m (50 cm)</option>
            <option value="1">1.00 m (1 m)</option>
          </select>
        )}

        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        {/* Angle Snap Toggle */}
        <button
          onClick={() => setAngleSnap(!angleSnap)}
          title="Ajuste de Ángulo Ortogonal (0°, 45°, 90°)"
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            angleSnap
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold'
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Ángulos 45°/90°</span>
        </button>

        {/* Dimensions Toggle */}
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          title="Mostrar/Ocultar Cotas de Medida"
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            showDimensions
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold'
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Cotas de Medida</span>
        </button>
      </div>

      {/* Center: Live Coordinates & Area */}
      <div className="hidden md:flex items-center gap-4 font-mono text-slate-300">
        <div>
          <span>Superficie Útil: </span>
          <span className="text-cyan-400 font-bold">{totalArea} m²</span>
        </div>
        <div className="text-slate-600">•</div>
        <div>
          <span>X: </span>
          <span className="text-white">{cursorWorldPos.x.toFixed(2)}m </span>
          <span>Y: </span>
          <span className="text-white">{cursorWorldPos.y.toFixed(2)}m</span>
        </div>
      </div>

      {/* Right: Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z * 0.85))}
          title="Alejar Zoom"
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="font-mono text-xs text-slate-300 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(4.0, z * 1.15))}
          title="Acercar Zoom"
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          title="Restablecer Zoom y Centrado 2D"
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition ml-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
