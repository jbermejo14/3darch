import React from 'react';
import { X, Keyboard, Mouse, Compass, Footprints, Sparkles } from 'lucide-react';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Guía de Uso y Atajos de Teclado</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Herramientas Principales */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-cyan-400">
              <Keyboard className="w-4 h-4" /> Atajos de Herramientas
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'V', desc: 'Herramienta Selección / Mover' },
                { key: 'W', desc: 'Dibujar Muro (clic y encadenar)' },
                { key: 'D', desc: 'Colocar Puerta sobre muro' },
                { key: 'O', desc: 'Colocar Ventana sobre muro' },
                { key: 'F', desc: 'Abrir Catálogo de Mobiliario' },
                { key: 'M', desc: 'Cinta Métrica' },
                { key: 'H', desc: 'Mano / Desplazar plano' },
                { key: 'Supr / Backspace', desc: 'Eliminar elemento seleccionado' },
                { key: 'Esc / Clic Der.', desc: 'Terminar cadena de muros o cancelar' },
                { key: 'Ctrl + Z', desc: 'Deshacer última acción' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                  <span>{item.desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-cyan-300 font-mono rounded text-[11px] font-semibold">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Navegación y Ratón */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-emerald-400">
              <Mouse className="w-4 h-4" /> Controles de Ratón y Gestos
            </h4>
            <div className="space-y-2">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="font-semibold text-white">Rueda del Ratón:</span> Zoom in / Zoom out centrado en la posición del puntero.
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="font-semibold text-white">Botón Central o Shift + Arrastrar:</span> Panorámica / Desplazamiento libre del plano 2D.
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="font-semibold text-white">Arrastrar Vértices de Muros:</span> Haz clic en un muro y arrastra sus puntos azules para ajustar ángulos o dimensiones.
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="font-semibold text-white">Rotación de Muebles:</span> Selecciona un mueble y arrastra el tirador circular azul superior para girarlo libremente.
              </div>
            </div>
          </div>

          {/* Modo 3D y Paseo Virtual */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-amber-400">
              <Footprints className="w-4 h-4" /> Renderizado 3D y Paseo Virtual (Walkthrough)
            </h4>
            <div className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-xl text-amber-200/90 space-y-1.5">
              <p>
                • <strong>Vista Órbita 360°:</strong> Arrastra con el botón izquierdo para rotar la casa tridimensionalmente. Botón derecho para desplazar cámara.
              </p>
              <p>
                • <strong>Paseo Virtual en Primera Persona:</strong> Haz clic en el botón <span className="text-white font-semibold">"Paseo Virtual"</span> en la vista 3D. Muévete dentro de la vivienda usando las teclas <kbd className="px-1 bg-slate-800 text-white rounded">W</kbd> <kbd className="px-1 bg-slate-800 text-white rounded">A</kbd> <kbd className="px-1 bg-slate-800 text-white rounded">S</kbd> <kbd className="px-1 bg-slate-800 text-white rounded">D</kbd> y arrastra el ratón para mirar alrededor.
              </p>
              <p>
                • <strong>Plantas Múltiples:</strong> Puedes crear tantas plantas como desees en el menú superior y activar o desactivar su visibilidad en 3D.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
