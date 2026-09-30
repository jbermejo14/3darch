import React, { useState } from 'react';
import { useArchitectStore } from '../../store/useArchitectStore';
import { FURNITURE_CATALOG } from '../../store/furnitureCatalog';
import { FurnitureCategory } from '../../types/architectural';
import { 
  X, 
  Search, 
  Armchair, 
  Bed, 
  Utensils, 
  Bath, 
  Briefcase, 
  PlusCircle,
  Check
} from 'lucide-react';

interface FurnitureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FurnitureDrawer: React.FC<FurnitureDrawerProps> = ({ isOpen, onClose }) => {
  const selectedCatalogItemId = useArchitectStore((s) => s.selectedCatalogItemId);
  const setSelectedCatalogItemId = useArchitectStore((s) => s.setSelectedCatalogItemId);
  const setActiveTool = useArchitectStore((s) => s.setActiveTool);

  const [activeCategory, setActiveCategory] = useState<FurnitureCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories: { id: FurnitureCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todos', icon: null },
    { id: 'living', label: 'Salón', icon: <Armchair className="w-3.5 h-3.5" /> },
    { id: 'bedroom', label: 'Dormitorio', icon: <Bed className="w-3.5 h-3.5" /> },
    { id: 'kitchen', label: 'Cocina', icon: <Utensils className="w-3.5 h-3.5" /> },
    { id: 'bathroom', label: 'Baño', icon: <Bath className="w-3.5 h-3.5" /> },
    { id: 'office', label: 'Oficina', icon: <Briefcase className="w-3.5 h-3.5" /> },
  ];

  const filteredItems = FURNITURE_CATALOG.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleSelectItem = (id: string) => {
    setSelectedCatalogItemId(id);
    setActiveTool('furniture');
    onClose();
  };

  return (
    <div className="fixed inset-y-0 left-0 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700 shadow-2xl z-40 flex flex-col transition-all">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Armchair className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">Catálogo de Mobiliario</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar mueble..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Furniture Items Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredItems.map((item) => {
          const isSelected = selectedCatalogItemId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleSelectItem(item.id)}
              className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500 shadow-md'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border border-slate-700 shadow-inner flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                >
                  <div className="w-4 h-4 rounded bg-white/20" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                    {item.name}
                  </h4>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {item.width}m × {item.depth}m (Alt: {item.height}m)
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                {isSelected ? (
                  <div className="p-1 bg-blue-500 text-white rounded-full">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="p-1.5 text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 rounded-lg transition">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            No se encontraron muebles con ese nombre.
          </div>
        )}
      </div>

      {/* Helper Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-400">
        💡 Selecciona un mueble y haz clic en cualquier lugar del plano 2D para colocarlo.
      </div>
    </div>
  );
};
