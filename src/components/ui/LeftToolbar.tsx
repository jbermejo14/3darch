import React from 'react';
import { useArchitectStore } from '../../store/useArchitectStore';
import { ToolMode } from '../../types/architectural';
import { 
  MousePointer, 
  PenTool, 
  DoorClosed, 
  Square, 
  Armchair, 
  Ruler, 
  Hand,
  Maximize,
  Footprints
} from 'lucide-react';

interface LeftToolbarProps {
  onOpenFurnitureCatalog: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({ onOpenFurnitureCatalog }) => {
  const activeTool = useArchitectStore((s) => s.activeTool);
  const setActiveTool = useArchitectStore((s) => s.setActiveTool);
  const autoDetectRooms = useArchitectStore((s) => s.autoDetectRooms);

  const tools: { id: ToolMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Seleccionar / Mover', icon: <MousePointer className="w-5 h-5" />, shortcut: 'V' },
    { id: 'wall', label: 'Trazar Muro', icon: <PenTool className="w-5 h-5" />, shortcut: 'W' },
    { id: 'door', label: 'Colocar Puerta', icon: <DoorClosed className="w-5 h-5" />, shortcut: 'D' },
    { id: 'window', label: 'Colocar Ventana', icon: <Square className="w-5 h-5" />, shortcut: 'O' },
    { id: 'stairs', label: 'Añadir Escalera', icon: <Footprints className="w-5 h-5" />, shortcut: 'E' },
    { id: 'furniture', label: 'Catálogo de Muebles', icon: <Armchair className="w-5 h-5" />, shortcut: 'F' },
    { id: 'measure', label: 'Cinta Métrica', icon: <Ruler className="w-5 h-5" />, shortcut: 'M' },
    { id: 'pan', label: 'Desplazar Plano', icon: <Hand className="w-5 h-5" />, shortcut: 'H' },
  ];

  return (
    <div className="absolute top-20 left-4 z-20 flex flex-col items-center bg-slate-900/85 backdrop-blur-md border border-slate-700/70 p-1.5 rounded-2xl shadow-2xl space-y-1.5">
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => {
              setActiveTool(t.id);
              if (t.id === 'furniture') {
                onOpenFurnitureCatalog();
              }
            }}
            title={`${t.label} (${t.shortcut})`}
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            {t.icon}

            {/* Floating Tooltip */}
            <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
              <span className="font-medium">{t.label}</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-cyan-400 font-mono">
                {t.shortcut}
              </kbd>
            </div>
          </button>
        );
      })}

      <div className="w-6 h-[1px] bg-slate-700/60 my-1" />

      {/* Recalculate Rooms button */}
      <button
        onClick={() => autoDetectRooms()}
        title="Detectar Habitaciones Cerradas"
        className="group relative p-2.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition"
      >
        <Maximize className="w-5 h-5" />
        <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
          <span>Auto-detectar Habitaciones ($m^2$)</span>
        </div>
      </button>
    </div>
  );
};
