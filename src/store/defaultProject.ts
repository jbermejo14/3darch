import { Project } from '../types/architectural';

export const createDefaultProject = (): Project => ({
  id: 'proj_default_villa',
  name: 'Vivienda Contemporánea 2D/3D',
  unit: 'm',
  activeLevelId: 'level_0',
  levels: [
    {
      id: 'level_0',
      name: 'Planta Principal',
      altitude: 0,
      wallHeight: 2.6,
      wallThickness: 0.18,
      walls: [
        // Exterior Boundary
        // Top wall: (-4, -3) to (5, -3)
        { id: 'w_ext_top', start: { x: -4, y: -3 }, end: { x: 5, y: -3 }, thickness: 0.20, height: 2.6, color: '#f1f5f9' },
        // Right wall: (5, -3) to (5, 4)
        { id: 'w_ext_right', start: { x: 5, y: -3 }, end: { x: 5, y: 4 }, thickness: 0.20, height: 2.6, color: '#f1f5f9' },
        // Bottom wall: (5, 4) to (-4, 4)
        { id: 'w_ext_bot', start: { x: 5, y: 4 }, end: { x: -4, y: 4 }, thickness: 0.20, height: 2.6, color: '#f1f5f9' },
        // Left wall: (-4, 4) to (-4, -3)
        { id: 'w_ext_left', start: { x: -4, y: 4 }, end: { x: -4, y: -3 }, thickness: 0.20, height: 2.6, color: '#f1f5f9' },

        // Interior Partition 1: Vertical dividing Bedrooms from Living/Kitchen (at x = 0.5)
        { id: 'w_int_v1', start: { x: 0.5, y: -3 }, end: { x: 0.5, y: 4 }, thickness: 0.15, height: 2.6, color: '#e2e8f0' },

        // Interior Partition 2: Horizontal dividing Master Bed from Office/Bed 2 (at y = 0.8, x from -4 to 0.5)
        { id: 'w_int_h1', start: { x: -4, y: 0.8 }, end: { x: 0.5, y: 0.8 }, thickness: 0.15, height: 2.6, color: '#e2e8f0' },

        // Interior Partition 3: Bathroom corner (x: -1.8 to 0.5, y: -0.8 to 0.8)
        { id: 'w_bath_v', start: { x: -1.8, y: -0.8 }, end: { x: -1.8, y: 0.8 }, thickness: 0.15, height: 2.6, color: '#e2e8f0' },
        { id: 'w_bath_h', start: { x: -1.8, y: -0.8 }, end: { x: 0.5, y: -0.8 }, thickness: 0.15, height: 2.6, color: '#e2e8f0' },

        // Interior Partition 4: Kitchen partial wall (at y = 0.5, x from 2.5 to 5)
        { id: 'w_kitch_h', start: { x: 2.5, y: 0.5 }, end: { x: 5, y: 0.5 }, thickness: 0.15, height: 2.6, color: '#e2e8f0' },
      ],
      rooms: [
        {
          id: 'room_living',
          name: 'Salón - Comedor',
          polygonPoints: [
            { x: 0.5, y: -3 },
            { x: 5, y: -3 },
            { x: 5, y: 0.5 },
            { x: 2.5, y: 0.5 },
            { x: 2.5, y: 4 },
            { x: 0.5, y: 4 },
          ],
          floorColor: '#d4b896',
          floorTexture: 'parquet',
          ceilingVisible: false,
          area: 24.5,
        },
        {
          id: 'room_kitchen',
          name: 'Cocina Gourmet',
          polygonPoints: [
            { x: 2.5, y: 0.5 },
            { x: 5, y: 0.5 },
            { x: 5, y: 4 },
            { x: 2.5, y: 4 },
          ],
          floorColor: '#e2e8f0',
          floorTexture: 'tiles',
          ceilingVisible: false,
          area: 8.75,
        },
        {
          id: 'room_master_bed',
          name: 'Dormitorio Principal',
          polygonPoints: [
            { x: -4, y: -3 },
            { x: 0.5, y: -3 },
            { x: 0.5, y: -0.8 },
            { x: -1.8, y: -0.8 },
            { x: -1.8, y: 0.8 },
            { x: -4, y: 0.8 },
          ],
          floorColor: '#c49a6c',
          floorTexture: 'wood',
          ceilingVisible: false,
          area: 14.8,
        },
        {
          id: 'room_bath',
          name: 'Baño Principal',
          polygonPoints: [
            { x: -1.8, y: -0.8 },
            { x: 0.5, y: -0.8 },
            { x: 0.5, y: 0.8 },
            { x: -1.8, y: 0.8 },
          ],
          floorColor: '#f1f5f9',
          floorTexture: 'marble',
          ceilingVisible: false,
          area: 3.68,
        },
        {
          id: 'room_bed2',
          name: 'Estudio / Dormitorio 2',
          polygonPoints: [
            { x: -4, y: 0.8 },
            { x: 0.5, y: 0.8 },
            { x: 0.5, y: 4 },
            { x: -4, y: 4 },
          ],
          floorColor: '#bfa07c',
          floorTexture: 'wood',
          ceilingVisible: false,
          area: 14.4,
        },
      ],
      openings: [
        // Exterior Doors & Windows
        { id: 'op_entry_door', wallId: 'w_ext_bot', type: 'door', distanceRatio: 0.75, width: 0.95, height: 2.15, elevation: 0, style: 'single' },
        { id: 'op_living_window1', wallId: 'w_ext_top', type: 'window', distanceRatio: 0.75, width: 1.8, height: 1.4, elevation: 0.8 },
        { id: 'op_living_window2', wallId: 'w_ext_right', type: 'window', distanceRatio: 0.35, width: 2.0, height: 1.8, elevation: 0.4 },
        { id: 'op_bed_window', wallId: 'w_ext_top', type: 'window', distanceRatio: 0.25, width: 1.4, height: 1.3, elevation: 0.9 },
        { id: 'op_bed2_window', wallId: 'w_ext_left', type: 'window', distanceRatio: 0.75, width: 1.4, height: 1.3, elevation: 0.9 },

        // Interior Doors
        { id: 'op_door_master', wallId: 'w_int_v1', type: 'door', distanceRatio: 0.18, width: 0.85, height: 2.1, elevation: 0, style: 'single' },
        { id: 'op_door_bath', wallId: 'w_bath_h', type: 'door', distanceRatio: 0.5, width: 0.75, height: 2.1, elevation: 0, style: 'single' },
        { id: 'op_door_bed2', wallId: 'w_int_v1', type: 'door', distanceRatio: 0.72, width: 0.85, height: 2.1, elevation: 0, style: 'single' },
      ],
      furniture: [
        // Living room
        { id: 'f_sofa', catalogId: 'sofa_modern', name: 'Sofá Moderno', category: 'living', x: 2.6, y: -1.5, rotation: 0, width: 2.2, depth: 0.9, height: 0.8, color: '#334155' },
        { id: 'f_coffee', catalogId: 'coffee_table', name: 'Mesa de Centro', category: 'living', x: 2.6, y: -0.6, rotation: 0, width: 1.1, depth: 0.6, height: 0.42, color: '#78350f' },
        { id: 'f_tv', catalogId: 'tv_unit', name: 'Mueble TV', category: 'living', x: 2.6, y: 0.25, rotation: 0, width: 2.0, depth: 0.45, height: 0.5, color: '#1e293b' },
        { id: 'f_plant', catalogId: 'indoor_plant', name: 'Planta de Interior', category: 'living', x: 4.4, y: -2.4, rotation: 0, width: 0.6, depth: 0.6, height: 1.2, color: '#16a34a' },
        { id: 'f_dining', catalogId: 'dining_table_6', name: 'Mesa Comedor', category: 'kitchen', x: 1.7, y: 2.2, rotation: 90, width: 1.8, depth: 0.9, height: 0.76, color: '#b45309' },

        // Kitchen
        { id: 'f_island', catalogId: 'kitchen_island', name: 'Isla de Cocina', category: 'kitchen', x: 3.8, y: 2.2, rotation: 90, width: 2.4, depth: 0.9, height: 0.92, color: '#0f172a' },
        { id: 'f_fridge', catalogId: 'refrigerator', name: 'Frigorífico Combi', category: 'kitchen', x: 4.4, y: 3.5, rotation: 0, width: 0.7, depth: 0.7, height: 1.85, color: '#cbd5e1' },

        // Master Bedroom
        { id: 'f_bed_master', catalogId: 'bed_king', name: 'Cama King Size', category: 'bedroom', x: -2.8, y: -1.7, rotation: 90, width: 1.9, depth: 2.1, height: 0.95, color: '#475569' },
        { id: 'f_night1', catalogId: 'nightstand', name: 'Mesita Izq.', category: 'bedroom', x: -2.8, y: -2.8, rotation: 0, width: 0.5, depth: 0.4, height: 0.55, color: '#d97706' },
        { id: 'f_night2', catalogId: 'nightstand', name: 'Mesita Der.', category: 'bedroom', x: -2.8, y: -0.6, rotation: 0, width: 0.5, depth: 0.4, height: 0.55, color: '#d97706' },
        { id: 'f_closet', catalogId: 'wardrobe_closet', name: 'Armario Empotrado', category: 'bedroom', x: -3.6, y: -0.5, rotation: 90, width: 2.0, depth: 0.65, height: 2.2, color: '#f8fafc' },

        // Bathroom
        { id: 'f_bath', catalogId: 'bathtub_modern', name: 'Bañera Exenta', category: 'bathroom', x: -1.0, y: -0.4, rotation: 0, width: 1.6, depth: 0.75, height: 0.6, color: '#ffffff' },
        { id: 'f_vanity', catalogId: 'bathroom_vanity', name: 'Lavabo y Espejo', category: 'bathroom', x: -0.5, y: 0.45, rotation: 180, width: 0.9, depth: 0.45, height: 0.85, color: '#475569' },
        { id: 'f_toilet', catalogId: 'toilet', name: 'Inodoro', category: 'bathroom', x: -1.4, y: 0.45, rotation: 180, width: 0.4, depth: 0.55, height: 0.42, color: '#ffffff' },

        // Bed 2 / Office
        { id: 'f_bed_single', catalogId: 'bed_single', name: 'Cama Individual', category: 'bedroom', x: -1.0, y: 2.8, rotation: 0, width: 1.0, depth: 2.0, height: 0.85, color: '#64748b' },
        { id: 'f_desk', catalogId: 'desk_workstation', name: 'Escritorio de Trabajo', category: 'office', x: -2.8, y: 2.0, rotation: 0, width: 1.5, depth: 0.75, height: 0.75, color: '#2563eb' },
        { id: 'f_chair', catalogId: 'office_chair', name: 'Silla Ergonómica', category: 'office', x: -2.8, y: 2.6, rotation: 180, width: 0.65, depth: 0.65, height: 0.95, color: '#0f172a' },
      ],
    },
  ],
});
