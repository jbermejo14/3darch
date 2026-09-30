import React, { useState } from 'react';
import { useArchitectStore } from '../store/useArchitectStore';
import { TopNavbar } from './ui/TopNavbar';
import { LeftToolbar } from './ui/LeftToolbar';
import { RightInspector } from './ui/RightInspector';
import { BottomStatusBar } from './ui/BottomStatusBar';
import { FurnitureDrawer } from './ui/FurnitureDrawer';
import { HelpShortcutsModal } from './ui/HelpShortcutsModal';
import { Canvas2D } from './editor2d/Canvas2D';
import { Scene3D } from '../viewport3d/Scene3D';

export const Layout: React.FC = () => {
  const viewMode = useArchitectStore((s) => s.viewMode);
  const [isFurnitureDrawerOpen, setIsFurnitureDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* 1. Top Navigation Bar */}
      <TopNavbar onOpenHelp={() => setIsHelpOpen(true)} />

      {/* 2. Main Work Area (2D, 3D, Split) */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Floating Tools on Left (Visible in 2D or Split mode) */}
        {viewMode !== '3d' && (
          <LeftToolbar onOpenFurnitureCatalog={() => setIsFurnitureDrawerOpen(true)} />
        )}

        {/* Viewport Area */}
        <div className="flex-1 relative flex overflow-hidden">
          {viewMode === '2d' && (
            <div className="w-full h-full relative">
              <Canvas2D />
            </div>
          )}

          {viewMode === '3d' && (
            <div className="w-full h-full relative">
              <Scene3D />
            </div>
          )}

          {viewMode === 'split' && (
            <div className="w-full h-full flex flex-col md:flex-row">
              {/* Left: 2D Plan */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full relative border-b md:border-b-0 md:border-r border-slate-800">
                <Canvas2D />
                <div className="absolute top-4 left-16 md:left-20 pointer-events-none bg-slate-900/80 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-300 border border-slate-800">
                  VISTA 2D PLANO
                </div>
              </div>

              {/* Right: 3D Render */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full relative">
                <Scene3D />
                <div className="absolute top-4 right-16 pointer-events-none bg-slate-900/80 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-300 border border-slate-800">
                  VISTA 3D RENDER
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Property Inspector Panel */}
        <RightInspector />

        {/* Sliding Furniture Catalog Drawer */}
        <FurnitureDrawer
          isOpen={isFurnitureDrawerOpen}
          onClose={() => setIsFurnitureDrawerOpen(false)}
        />
      </div>

      {/* 3. Bottom Status Bar */}
      <BottomStatusBar />

      {/* 4. Help & Shortcuts Modal */}
      <HelpShortcutsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};
