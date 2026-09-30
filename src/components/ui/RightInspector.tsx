import React, { useState } from 'react';
import { useArchitectStore } from '../../store/useArchitectStore';
import { FloorTextureType } from '../../types/architectural';
import { distance } from '../../utils/geometry2d';
import { 
  Sliders, 
  Trash2, 
  Layers, 
  RotateCw, 
  PenTool, 
  Square, 
  Armchair, 
  DoorClosed, 
  Palette,
  Maximize2,
  Check,
  Footprints,
  MoveVertical,
  Box,
  EyeOff
} from 'lucide-react';

function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

function isWallOnRoomPerimeter(
  wall: { start: { x: number; y: number }; end: { x: number; y: number } },
  roomPoly: { x: number; y: number }[]
): boolean {
  for (let i = 0; i < roomPoly.length; i++) {
    const p1 = roomPoly[i];
    const p2 = roomPoly[(i + 1) % roomPoly.length];

    const d1 = distToSegment(p1, wall.start, wall.end);
    const d2 = distToSegment(p2, wall.start, wall.end);
    if (d1 < 0.25 && d2 < 0.25) return true;

    const dStart = distToSegment(wall.start, p1, p2);
    const dEnd = distToSegment(wall.end, p1, p2);
    if (dStart < 0.25 && dEnd < 0.25) return true;

    const midRoom = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    if (distToSegment(midRoom, wall.start, wall.end) < 0.25) return true;

    const midWall = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
    if (distToSegment(midWall, p1, p2) < 0.25) return true;
  }
  return false;
}

export const RightInspector: React.FC = () => {
  const [autoAdjustWalls, setAutoAdjustWalls] = useState(true);

  const project = useArchitectStore((s) => s.project);
  const activeLevelId = useArchitectStore((s) => s.activeLevelId);
  const selectedItem = useArchitectStore((s) => s.selectedItem);
  const setSelectedItem = useArchitectStore((s) => s.setSelectedItem);
  const explodedViewOffset = useArchitectStore((s) => s.explodedViewOffset);
  const setExplodedViewOffset = useArchitectStore((s) => s.setExplodedViewOffset);
  const wallDisplayMode = useArchitectStore((s) => s.wallDisplayMode);
  const setWallDisplayMode = useArchitectStore((s) => s.setWallDisplayMode);

  const updateWall = useArchitectStore((s) => s.updateWall);
  const deleteWall = useArchitectStore((s) => s.deleteWall);
  const updateRoom = useArchitectStore((s) => s.updateRoom);
  const deleteRoom = useArchitectStore((s) => s.deleteRoom);
  const updateOpening = useArchitectStore((s) => s.updateOpening);
  const deleteOpening = useArchitectStore((s) => s.deleteOpening);
  const updateFurniture = useArchitectStore((s) => s.updateFurniture);
  const deleteFurniture = useArchitectStore((s) => s.deleteFurniture);
  const updateStaircase = useArchitectStore((s) => s.updateStaircase);
  const deleteStaircase = useArchitectStore((s) => s.deleteStaircase);
  const updateLevel = useArchitectStore((s) => s.updateLevel);

  const activeLevel = project.levels.find((l) => l.id === activeLevelId) || project.levels[0];

  // Helper for total area
  const totalLevelArea = activeLevel.rooms.reduce((acc, r) => acc + r.area, 0).toFixed(1);

  // If Wall is selected
  if (selectedItem?.type === 'wall') {
    const wall = activeLevel.walls.find((w) => w.id === selectedItem.id);
    if (!wall) return null;
    const wallLen = distance(wall.start, wall.end).toFixed(2);

    return (
      <aside className="w-72 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-4 flex flex-col gap-4 text-xs select-none shadow-2xl z-20 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            <PenTool className="w-4 h-4" />
            <span className="text-white">Propiedades del Muro</span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Longitud del Tramo</label>
          <div className="mt-1 font-mono text-sm font-semibold text-white bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
            {wallLen} m
          </div>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Grosor de Pared</label>
          <div className="grid grid-cols-4 gap-1.5 mt-1.5">
            {[0.10, 0.15, 0.20, 0.30].map((th) => (
              <button
                key={th}
                onClick={() => updateWall(wall.id, { thickness: th })}
                className={`py-1.5 rounded-lg border font-mono text-xs transition ${
                  Math.abs(wall.thickness - th) < 0.01
                    ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {th * 100}cm
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Altura de Pared (Extrusión 3D)</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {[2.40, 2.60, 2.80].map((h) => (
              <button
                key={h}
                onClick={() => updateWall(wall.id, { height: h })}
                className={`py-1.5 rounded-lg border font-mono text-xs transition ${
                  Math.abs(wall.height - h) < 0.01
                    ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {h}m
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Color de Acabado</label>
          <div className="flex items-center gap-2 mt-2">
            {['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#fef08a', '#bbf7d0'].map((col) => (
              <button
                key={col}
                onClick={() => updateWall(wall.id, { color: col })}
                className="w-7 h-7 rounded-full border-2 transition transform hover:scale-110"
                style={{
                  backgroundColor: col,
                  borderColor: wall.color === col ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => deleteWall(wall.id)}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar Muro</span>
        </button>
      </aside>
    );
  }

  // If Room is selected
  if (selectedItem?.type === 'room') {
    const room = activeLevel.rooms.find((r) => r.id === selectedItem.id);
    if (!room) return null;

    const floorTextures: { id: FloorTextureType; label: string }[] = [
      { id: 'parquet', label: 'Parquet Roble' },
      { id: 'wood', label: 'Madera Natural' },
      { id: 'tiles', label: 'Cerámica / Gres' },
      { id: 'marble', label: 'Mármol Blanco' },
      { id: 'concrete', label: 'Microcemento' },
      { id: 'carpet', label: 'Moqueta' },
    ];

    return (
      <aside className="w-72 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-4 flex flex-col gap-4 text-xs select-none shadow-2xl z-20 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Square className="w-4 h-4" />
            <span className="text-white">Estancia / Habitación</span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Nombre de la Habitación</label>
          <input
            type="text"
            value={room.name}
            onChange={(e) => updateRoom(room.id, { name: e.target.value })}
            className="w-full mt-1 bg-slate-950 text-white font-semibold px-3 py-2 rounded-lg border border-slate-800 focus:border-cyan-500 outline-none"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium">Superficie Calculada</label>
          <div className="mt-1 font-mono text-base font-bold text-cyan-400 bg-cyan-950/30 px-3 py-2 rounded-lg border border-cyan-800/60 flex items-center justify-between">
            <span>{room.area} m²</span>
            <span className="text-[11px] text-cyan-300 font-normal">({(room.area * 10.764).toFixed(1)} sq ft)</span>
          </div>
        </div>

        {/* Room Height Setting (Altura libre de la habitación) */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-medium">Altura de Techo / Muros</label>
            <span className="font-mono text-cyan-400 font-bold text-xs">
              {(room.height ?? activeLevel.wallHeight ?? 2.6).toFixed(2)} m
            </span>
          </div>

          {(() => {
            const currentRoomH = room.height ?? activeLevel.wallHeight ?? 2.6;
            const applyRoomHeight = (newH: number) => {
              updateRoom(room.id, { height: newH });
              if (autoAdjustWalls) {
                const poly = room.polygonPoints;
                const bWalls = activeLevel.walls.filter((w) => isWallOnRoomPerimeter(w, poly));
                bWalls.forEach((w) => updateWall(w.id, { height: newH }));
              }
            };

            return (
              <>
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  {[2.40, 2.60, 2.80, 3.20].map((h) => (
                    <button
                      key={h}
                      onClick={() => applyRoomHeight(h)}
                      className={`py-1.5 rounded-lg border font-mono text-xs transition ${
                        Math.abs(currentRoomH - h) < 0.05
                          ? 'bg-cyan-600 text-white border-cyan-400 font-semibold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {h.toFixed(2)}m
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1 mt-1">
                  {[
                    { label: '4.00m (Loft / Alta)', val: 4.0 },
                    { label: '5.20m (Doble Altura)', val: 5.2 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => applyRoomHeight(p.val)}
                      className={`py-1.5 rounded-lg border font-mono text-[11px] transition ${
                        Math.abs(currentRoomH - p.val) < 0.05
                          ? 'bg-cyan-600 text-white border-cyan-400 font-semibold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="range"
                    min="2.0"
                    max="7.0"
                    step="0.1"
                    value={currentRoomH}
                    onChange={(e) => applyRoomHeight(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="1.8"
                    max="10"
                    value={currentRoomH}
                    onChange={(e) => applyRoomHeight(parseFloat(e.target.value) || 2.6)}
                    className="w-16 bg-slate-950 text-white font-mono px-2 py-1 rounded border border-slate-800 text-center text-xs"
                  />
                </div>
              </>
            );
          })()}

          <label className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAdjustWalls}
              onChange={(e) => setAutoAdjustWalls(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            <span>Ajustar altura de muros perimetrales</span>
          </label>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Material del Suelo (3D)</label>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            {floorTextures.map((tex) => (
              <button
                key={tex.id}
                onClick={() => updateRoom(room.id, { floorTexture: tex.id })}
                className={`py-2 px-2 rounded-lg border text-left text-[11px] font-medium transition ${
                  room.floorTexture === tex.id
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {tex.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => deleteRoom(room.id)}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar Habitación</span>
        </button>
      </aside>
    );
  }

  // If Opening (Door or Window) is selected
  if (selectedItem?.type === 'opening') {
    const op = activeLevel.openings.find((o) => o.id === selectedItem.id);
    if (!op) return null;

    return (
      <aside className="w-72 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-4 flex flex-col gap-4 text-xs select-none shadow-2xl z-20 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <DoorClosed className="w-4 h-4" />
            <span className="text-white">{op.type === 'door' ? 'Puerta' : 'Ventana'}</span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Ancho (m)</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="0.6"
              max="2.8"
              step="0.05"
              value={op.width}
              onChange={(e) => updateOpening(op.id, { width: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-500"
            />
            <span className="font-mono text-white font-bold w-12 text-right">{op.width} m</span>
          </div>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Alto (m)</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="0.8"
              max="2.5"
              step="0.05"
              value={op.height}
              onChange={(e) => updateOpening(op.id, { height: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-500"
            />
            <span className="font-mono text-white font-bold w-12 text-right">{op.height} m</span>
          </div>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Elevación desde el suelo (m)</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={op.elevation}
              onChange={(e) => updateOpening(op.id, { elevation: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-500"
            />
            <span className="font-mono text-white font-bold w-12 text-right">{op.elevation} m</span>
          </div>
        </div>

        <button
          onClick={() => deleteOpening(op.id)}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar {op.type === 'door' ? 'Puerta' : 'Ventana'}</span>
        </button>
      </aside>
    );
  }

  // If Furniture is selected
  if (selectedItem?.type === 'furniture') {
    const f = activeLevel.furniture.find((item) => item.id === selectedItem.id);
    if (!f) return null;

    return (
      <aside className="w-72 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-4 flex flex-col gap-4 text-xs select-none shadow-2xl z-20 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
            <Armchair className="w-4 h-4" />
            <span className="text-white">Mobiliario</span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Nombre</label>
          <input
            type="text"
            value={f.name}
            onChange={(e) => updateFurniture(f.id, { name: e.target.value })}
            className="w-full mt-1 bg-slate-950 text-white font-semibold px-3 py-2 rounded-lg border border-slate-800 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-medium">Rotación (Grados)</label>
            <span className="font-mono text-cyan-400 font-bold">{f.rotation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={f.rotation}
            onChange={(e) => updateFurniture(f.id, { rotation: parseInt(e.target.value) })}
            className="w-full mt-2 accent-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-slate-400 font-medium">Ancho (m)</label>
            <input
              type="number"
              step="0.05"
              value={f.width}
              onChange={(e) => updateFurniture(f.id, { width: parseFloat(e.target.value) })}
              className="w-full mt-1 bg-slate-950 text-white px-2 py-1.5 rounded-lg border border-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 font-medium">Fondo (m)</label>
            <input
              type="number"
              step="0.05"
              value={f.depth}
              onChange={(e) => updateFurniture(f.id, { depth: parseFloat(e.target.value) })}
              className="w-full mt-1 bg-slate-950 text-white px-2 py-1.5 rounded-lg border border-slate-800 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Color de Tapizado / Acabado</label>
          <div className="flex items-center gap-2 mt-2">
            {['#334155', '#0284c7', '#15803d', '#b45309', '#e11d48', '#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => updateFurniture(f.id, { color: c })}
                className="w-7 h-7 rounded-full border-2 transition transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: f.color === c ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => deleteFurniture(f.id)}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar Mueble</span>
        </button>
      </aside>
    );
  }

  // If Staircase is selected
  if (selectedItem?.type === 'stairs') {
    const st = (activeLevel.staircases || []).find((s) => s.id === selectedItem.id);
    if (!st) return null;

    return (
      <aside className="w-72 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-4 flex flex-col gap-4 text-xs select-none shadow-2xl z-20 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <Footprints className="w-4 h-4" />
            <span className="text-white">Escalera Arquitectónica</span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Tipo de Escalera</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {[
              { id: 'straight', label: 'Recta' },
              { id: 'spiral', label: 'Caracol' },
              { id: 'l_shaped', label: 'En L' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => updateStaircase(st.id, { type: t.id })}
                className={`py-1.5 rounded-lg border text-center font-medium transition ${
                  st.type === t.id
                    ? 'bg-cyan-600 text-white border-cyan-400 font-semibold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-slate-400 font-medium">Rotación</label>
            <span className="font-mono text-cyan-400 font-bold">{st.rotation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={st.rotation}
            onChange={(e) => updateStaircase(st.id, { rotation: parseInt(e.target.value) })}
            className="w-full mt-2 accent-cyan-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-slate-400 font-medium">Ancho Huella (m)</label>
            <input
              type="number"
              step="0.05"
              value={st.width}
              onChange={(e) => updateStaircase(st.id, { width: parseFloat(e.target.value) })}
              className="w-full mt-1 bg-slate-950 text-white px-2 py-1.5 rounded-lg border border-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="text-slate-400 font-medium">Longitud Tramo (m)</label>
            <input
              type="number"
              step="0.1"
              value={st.length}
              onChange={(e) => updateStaircase(st.id, { length: parseFloat(e.target.value) })}
              className="w-full mt-1 bg-slate-950 text-white px-2 py-1.5 rounded-lg border border-slate-800 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-400 font-medium">Altura a salvar (m)</label>
          <input
            type="number"
            step="0.1"
            value={st.height}
            onChange={(e) => updateStaircase(st.id, { height: parseFloat(e.target.value) })}
            className="w-full mt-1 bg-slate-950 text-white px-2 py-1.5 rounded-lg border border-slate-800 font-mono"
          />
        </div>

        <div>
          <label className="text-slate-400 font-medium">Número de Peldaños</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="8"
              max="20"
              value={st.stepCount}
              onChange={(e) => updateStaircase(st.id, { stepCount: parseInt(e.target.value) })}
              className="flex-1 accent-cyan-400"
            />
            <span className="font-mono text-cyan-300 font-bold w-8 text-right">{st.stepCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-slate-300 font-medium">Diseño de Escalera</span>
          <span className="text-cyan-400 font-semibold text-[11px] bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            Abierta (Sin barandilla)
          </span>
        </div>

        <button
          onClick={() => deleteStaircase(st.id)}
          className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar Escalera</span>
        </button>
      </aside>
    );
  }

  // General Level Properties (Default when nothing is selected)
  return (
    <aside className="w-72 bg-slate-900/90 backdrop-blur-md border-l border-slate-800 p-4 flex flex-col gap-4 text-xs select-none shadow-2xl z-20 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-cyan-400 font-bold">
        <Layers className="w-4 h-4" />
        <span className="text-white">Ajustes de Planta</span>
      </div>

      <div>
        <label className="text-slate-400 font-medium">Nombre de la Planta</label>
        <input
          type="text"
          value={activeLevel.name}
          onChange={(e) => updateLevel(activeLevel.id, { name: e.target.value })}
          className="w-full mt-1 bg-slate-950 text-white font-semibold px-3 py-2 rounded-lg border border-slate-800 focus:border-cyan-500 outline-none"
        />
      </div>

      {/* Altura de Techo y Muros de la Planta */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-slate-300 font-medium">
          <label className="text-cyan-400 font-semibold flex items-center gap-1.5">
            <MoveVertical className="w-3.5 h-3.5" />
            Altura de Techos y Muros (m)
          </label>
          <span className="font-mono text-cyan-300 font-bold text-xs">
            {(activeLevel.wallHeight || 2.6).toFixed(2)} m
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Ajusta la altura real de todos los muros, techos y escaleras de esta planta (sin huecos ni vacíos).
        </p>

        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {[
            { label: '2.40m', val: 2.4 },
            { label: '2.60m', val: 2.6 },
            { label: '2.80m', val: 2.8 },
            { label: '3.20m', val: 3.2 },
            { label: '4.00m (Loft)', val: 4.0 },
            { label: '5.00m (Doble)', val: 5.0 },
          ].map((preset) => (
            <button
              key={preset.val}
              onClick={() => updateLevel(activeLevel.id, { wallHeight: preset.val })}
              className={`py-1.5 rounded-lg border font-mono text-xs transition ${
                Math.abs((activeLevel.wallHeight || 2.6) - preset.val) < 0.05
                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-md shadow-cyan-900/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Range Slider & Number Input */}
        <div className="flex items-center gap-2 mt-2">
          <input
            type="range"
            min="2.0"
            max="7.0"
            step="0.1"
            value={activeLevel.wallHeight || 2.6}
            onChange={(e) => updateLevel(activeLevel.id, { wallHeight: parseFloat(e.target.value) })}
            className="flex-1 accent-cyan-400 cursor-pointer"
          />
          <input
            type="number"
            step="0.1"
            min="1.8"
            max="12.0"
            value={activeLevel.wallHeight || 2.6}
            onChange={(e) => updateLevel(activeLevel.id, { wallHeight: parseFloat(e.target.value) || 2.6 })}
            className="w-16 bg-slate-900 text-cyan-300 font-mono font-bold px-2 py-1 rounded border border-slate-700 text-center text-xs"
          />
        </div>
      </div>

      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 block font-medium">Cota de Nivel (Altitud 3D)</span>
          <span className="text-[10px] text-slate-500">Alineada al piso inferior sin huecos</span>
        </div>
        <div className="font-mono text-sm font-bold text-slate-200 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
          +{activeLevel.altitude.toFixed(2)} m
        </div>
      </div>

      {/* Exploded View Control (when multiple levels exist) */}
      {project.levels.length > 1 && (
        <div className="bg-cyan-950/25 p-3 rounded-xl border border-cyan-800/40 space-y-2 mt-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <MoveVertical className="w-3.5 h-3.5" />
              Separación de Pisos (3D)
            </span>
            <span className="font-mono text-cyan-300 font-bold text-xs">
              {explodedViewOffset === 0 ? 'Juntas' : `${explodedViewOffset.toFixed(1)}m`}
            </span>
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
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: '0m', val: 0 },
              { label: '3m', val: 3 },
              { label: '6m', val: 6 },
              { label: '10m', val: 10 },
              { label: '15m', val: 15 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setExplodedViewOffset(p.val)}
                className={`py-1 rounded text-[10px] font-medium transition ${
                  Math.abs(explodedViewOffset - p.val) < 0.25
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wall Display Mode (Visualización de Paredes) */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 mt-1">
        <div className="flex items-center justify-between text-slate-300 font-medium">
          <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
            <Layers className="w-3.5 h-3.5" />
            Visualización de Paredes (3D)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'full', label: 'Paredes ON' },
            { id: 'low', label: 'Bajas (0.8m)' },
            { id: 'hidden', label: 'Sin Paredes' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setWallDisplayMode(m.id as any)}
              className={`py-1.5 rounded-lg border text-center text-[10px] font-semibold transition ${
                wallDisplayMode === m.id
                  ? m.id === 'hidden'
                    ? 'bg-amber-600 text-white border-amber-400 font-bold'
                    : m.id === 'low'
                    ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                    : 'bg-blue-600 text-white border-blue-400 font-bold'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Level Summary Card */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2 mt-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Resumen de Planta
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Superficie Útil:</span>
          <span className="font-mono font-bold text-cyan-400">{totalLevelArea} m²</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Muros Trazados:</span>
          <span className="font-mono text-white">{activeLevel.walls.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Habitaciones:</span>
          <span className="font-mono text-white">{activeLevel.rooms.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Puertas y Ventanas:</span>
          <span className="font-mono text-white">{activeLevel.openings.length}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Piezas Mobiliario:</span>
          <span className="font-mono text-white">{activeLevel.furniture.length}</span>
        </div>
      </div>
    </aside>
  );
};
