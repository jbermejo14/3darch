import React, { useState, useRef } from 'react';
import { useArchitectStore } from '../../store/useArchitectStore';
import { ViewMode } from '../../types/architectural';
import { 
  Home, 
  Layers, 
  Plus, 
  Copy, 
  Trash2, 
  Undo2, 
  Redo2, 
  Download, 
  Upload, 
  HelpCircle, 
  Sparkles,
  FilePlus,
  RefreshCw,
  LayoutGrid,
  Box,
  SplitSquareVertical,
  Check,
  Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TopNavbarProps {
  onOpenHelp: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenHelp }) => {
  const project = useArchitectStore((s) => s.project);
  const activeLevelId = useArchitectStore((s) => s.activeLevelId);
  const setActiveLevel = useArchitectStore((s) => s.setActiveLevel);
  const addLevel = useArchitectStore((s) => s.addLevel);
  const duplicateCurrentLevel = useArchitectStore((s) => s.duplicateCurrentLevel);
  const createUpperFloorFromCurrent = useArchitectStore((s) => s.createUpperFloorFromCurrent);
  const deleteLevel = useArchitectStore((s) => s.deleteLevel);
  const setProjectName = useArchitectStore((s) => s.setProjectName);

  const viewMode = useArchitectStore((s) => s.viewMode);
  const setViewMode = useArchitectStore((s) => s.setViewMode);

  const undoStack = useArchitectStore((s) => s.undoStack);
  const redoStack = useArchitectStore((s) => s.redoStack);
  const undo = useArchitectStore((s) => s.undo);
  const redo = useArchitectStore((s) => s.redo);

  const resetToDefaultProject = useArchitectStore((s) => s.resetToDefaultProject);
  const newEmptyProject = useArchitectStore((s) => s.newEmptyProject);
  const importProject = useArchitectStore((s) => s.importProject);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(project.name);
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeLevel = project.levels.find((l) => l.id === activeLevelId) || project.levels[0];

  // Save project to JSON file
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.name.toLowerCase().replace(/\s+/g, '_')}.archi.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.15 },
    });
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.levels && Array.isArray(parsed.levels)) {
          importProject(parsed);
          setNameInput(parsed.name || 'Proyecto Importado');
        } else {
          alert('El archivo JSON no tiene un formato válido de plano.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setProjectName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none z-30 relative shadow-md">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg shadow-lg shadow-blue-500/20 text-white font-bold text-sm tracking-wide">
          <Home className="w-4 h-4" />
          <span>ArchiCAD 3D</span>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Project Name editable */}
        {isEditingName ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              autoFocus
              className="bg-slate-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-500 outline-none w-44"
            />
            <button
              onClick={handleSaveName}
              className="p-1 hover:bg-slate-800 rounded text-emerald-400"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => {
              setNameInput(project.name);
              setIsEditingName(true);
            }}
            className="group flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer px-2 py-1 rounded-md hover:bg-slate-800/60 transition"
          >
            <span>{project.name}</span>
            <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
          </div>
        )}
      </div>

      {/* Center: View Switcher (2D / Split / 3D) */}
      <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          onClick={() => setViewMode('2d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            viewMode === '2d'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>2D Plano</span>
        </button>

        <button
          onClick={() => setViewMode('split')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            viewMode === 'split'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Dividido</span>
        </button>

        <button
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            viewMode === '3d'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D Render</span>
        </button>
      </div>

      {/* Right: Level Switcher & Actions */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Deshacer (Ctrl+Z)"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Rehacer (Ctrl+Y)"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Level Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLevelMenu(!showLevelMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeLevel.name}</span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-1 py-0.5 rounded">
              +{activeLevel.altitude}m
            </span>
          </button>

          {showLevelMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Plantas del Edificio
              </div>
              {project.levels.map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => {
                    setActiveLevel(lvl.id);
                    setShowLevelMenu(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-slate-800 transition ${
                    lvl.id === activeLevelId ? 'text-cyan-400 bg-cyan-950/30 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{lvl.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Alt: {lvl.altitude}m</span>
                </div>
              ))}

              <div className="border-t border-slate-800 my-1" />

              <button
                onClick={() => {
                  createUpperFloorFromCurrent();
                  setShowLevelMenu(false);
                  confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.2 },
                  });
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border-t border-b border-emerald-800/40 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>🏗️ Construir Planta Alta (Piso 1)</span>
              </button>

              <button
                onClick={() => {
                  addLevel();
                  setShowLevelMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Añadir Planta Vacía</span>
              </button>

              <button
                onClick={() => {
                  duplicateCurrentLevel();
                  setShowLevelMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Duplicar Planta Actual</span>
              </button>

              {project.levels.length > 1 && (
                <button
                  onClick={() => {
                    deleteLevel(activeLevelId);
                    setShowLevelMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Esta Planta</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Export / Import Menu */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportJSON}
            title="Exportar Proyecto en JSON"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Importar Proyecto JSON"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={resetToDefaultProject}
            title="Cargar Plantilla Demo de Vivienda Completa"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700 text-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </button>

          <button
            onClick={newEmptyProject}
            title="Nuevo Proyecto en Blanco"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 rounded-lg border border-slate-700 text-xs transition"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenHelp}
            title="Ayuda y Atajos de Teclado"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs transition ml-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
