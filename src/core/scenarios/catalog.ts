import type { FurnitureType } from '../model/types';

export interface RoomTypeDef {
  id: string;
  /** Capitalized display name; used lower-first inside sentences. */
  name: string;
  article: 'el' | 'la';
  /** Plausible furniture for this room. Repeats raise the probability. */
  furniture: FurnitureType[];
  /** Whether this room may have windows on exterior walls. */
  windows: boolean;
}

export interface ScenarioDef {
  id: string;
  name: string;
  rooms: RoomTypeDef[];
}

const room = (
  id: string,
  name: string,
  article: 'el' | 'la',
  furniture: FurnitureType[],
  windows = true,
): RoomTypeDef => ({ id, name, article, furniture, windows });

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'house',
    name: 'Casa',
    rooms: [
      room('living', 'Salón', 'el', ['sofa', 'sofa', 'armchair', 'tv', 'plant', 'rug', 'shelf', 'table']),
      room('kitchen', 'Cocina', 'la', ['fridge', 'table', 'chair', 'chair', 'plant']),
      room('bedroom', 'Dormitorio', 'el', ['bed', 'bed', 'wardrobe', 'rug', 'plant', 'tv']),
      room('bathroom', 'Baño', 'el', ['bathtub', 'toilet', 'sink', 'shower', 'towelRail', 'plant', 'rug']),
      room('office', 'Despacho', 'el', ['table', 'chair', 'shelf', 'shelf', 'plant']),
      room('hall', 'Recibidor', 'el', ['rack', 'plant', 'rug', 'bench']),
      room('dining', 'Comedor', 'el', ['table', 'table', 'chair', 'chair', 'chair', 'plant']),
      room('library', 'Biblioteca', 'la', ['shelf', 'shelf', 'armchair', 'sofa', 'rug', 'chair']),
      room('garage', 'Garaje', 'el', ['shelf', 'table', 'stool'], false),
      room('music', 'Sala de música', 'la', ['piano', 'chair', 'speaker', 'rug']),
      room('guest', 'Cuarto de invitados', 'el', ['bed', 'wardrobe', 'chair']),
      room('laundry', 'Lavadero', 'el', ['washer', 'washer', 'laundryBasket', 'towelRail', 'shelf', 'stool'], false),
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurante',
    rooms: [
      room('dining', 'Comedor', 'el', ['table', 'table', 'chair', 'chair', 'chair', 'plant']),
      room('kitchen', 'Cocina', 'la', ['fridge', 'counter', 'table', 'stool']),
      room('bar', 'Barra', 'la', ['counter', 'counter', 'stool', 'stool', 'plant']),
      room('terrace', 'Terraza', 'la', ['table', 'chair', 'chair', 'umbrella', 'plant']),
      room('pantry', 'Despensa', 'la', ['shelf', 'shelf', 'fridge'], false),
      room('toilet', 'Aseo', 'el', ['toilet', 'sink', 'plant', 'rug']),
      room('office', 'Oficina', 'la', ['table', 'chair', 'shelf']),
      room('private', 'Reservado', 'el', ['table', 'sofa', 'chair', 'plant']),
      room('cloakroom', 'Guardarropa', 'el', ['rack', 'rack', 'bench'], false),
      room('lounge', 'Sala de espera', 'la', ['sofa', 'armchair', 'plant', 'tv', 'rug']),
      room('cellar', 'Bodega', 'la', ['shelf', 'shelf', 'table', 'stool'], false),
      room('stage', 'Escenario', 'el', ['piano', 'speaker', 'chair']),
    ],
  },
  {
    id: 'nightclub',
    name: 'Discoteca',
    rooms: [
      room('dancefloor', 'Pista de baile', 'la', ['speaker', 'speaker', 'rug']),
      room('bar', 'Barra', 'la', ['counter', 'counter', 'stool', 'stool']),
      room('vip', 'Zona VIP', 'la', ['sofa', 'sofa', 'table', 'plant']),
      room('dj', 'Cabina del DJ', 'la', ['speaker', 'table', 'stool']),
      room('toilet', 'Aseos', 'el', ['toilet', 'toilet', 'sink', 'plant']),
      room('cloakroom', 'Guardarropa', 'el', ['rack', 'rack', 'bench'], false),
      room('smoking', 'Zona de fumadores', 'la', ['bench', 'plant', 'umbrella']),
      room('office', 'Oficina', 'la', ['table', 'chair', 'shelf']),
      room('storage', 'Almacén', 'el', ['shelf', 'shelf', 'fridge'], false),
      room('chillout', 'Chill-out', 'el', ['sofa', 'rug', 'plant', 'tv']),
      room('entrance', 'Entrada', 'la', ['rack', 'bench', 'plant']),
      room('backstage', 'Camerino', 'el', ['sofa', 'wardrobe', 'chair']),
    ],
  },
  {
    id: 'pool',
    name: 'Piscina',
    rooms: [
      room('solarium', 'Solárium', 'el', ['lounger', 'lounger', 'umbrella', 'plant']),
      room('changing', 'Vestuario', 'el', ['bench', 'bench', 'lockers', 'lockers'], false),
      room('showers', 'Duchas', 'la', ['shower', 'shower', 'towelRail', 'bench']),
      room('bar', 'Chiringuito', 'el', ['counter', 'stool', 'stool', 'fridge']),
      room('lifeguard', 'Caseta del socorrista', 'la', ['chair', 'table', 'shelf']),
      room('garden', 'Jardín', 'el', ['plant', 'plant', 'bench', 'umbrella']),
      room('sauna', 'Sauna', 'la', ['bench', 'bench'], false),
      room('kids', 'Zona infantil', 'la', ['umbrella', 'bench', 'rug']),
      room('terrace', 'Terraza', 'la', ['table', 'chair', 'chair', 'umbrella']),
      room('machine', 'Sala de máquinas', 'la', ['shelf', 'table'], false),
      room('reception', 'Recepción', 'la', ['counter', 'chair', 'plant']),
      room('gym', 'Gimnasio', 'el', ['treadmill', 'weightBench', 'yogaMat', 'tv']),
    ],
  },
  {
    id: 'mall',
    name: 'Centro comercial',
    rooms: [
      room('clothes', 'Tienda de ropa', 'la', ['clothesRack', 'clothesRack', 'mannequin', 'clothesTable', 'chair']),
      room('food', 'Zona de restauración', 'la', ['table', 'table', 'chair', 'chair', 'plant']),
      room('cinema', 'Cine', 'el', ['chair', 'chair', 'tv', 'speaker'], false),
      room('bookshop', 'Librería', 'la', ['shelf', 'shelf', 'display', 'armchair', 'rug']),
      room('electronics', 'Tienda de electrónica', 'la', ['tv', 'tv', 'speaker', 'checkout', 'securityGate']),
      room('supermarket', 'Supermercado', 'el', ['display', 'display', 'checkout', 'cart', 'basket']),
      room('toilets', 'Aseos', 'el', ['toilet', 'toilet', 'sink', 'plant'], false),
      room('cafe', 'Cafetería', 'la', ['counter', 'stool', 'table', 'chair']),
      room('security', 'Seguridad', 'la', ['tv', 'chair', 'table'], false),
      room('atrium', 'Atrio', 'el', ['plant', 'plant', 'bench']),
      room('furniture', 'Tienda de muebles', 'la', ['sofa', 'bed', 'table', 'rug']),
      room('music', 'Tienda de música', 'la', ['piano', 'speaker', 'shelf', 'stool']),
    ],
  },
  {
    id: 'gym',
    name: 'Gimnasio',
    rooms: [
      room('cardio', 'Sala de cardio', 'la', ['treadmill', 'treadmill', 'exerciseBike', 'tv']),
      room('weights', 'Sala de musculación', 'la', ['weightBench', 'weightBench', 'dumbbellRack', 'kettlebells']),
      room('yoga', 'Sala de yoga', 'la', ['yogaMat', 'yogaMat', 'yogaMat', 'plant']),
      room('boxing', 'Sala de boxeo', 'la', ['punchingBag', 'punchingBag', 'bench']),
      room('rowing', 'Sala de remo', 'la', ['rowingMachine', 'rowingMachine', 'speaker']),
      room('cycling', 'Sala de ciclo', 'la', ['exerciseBike', 'exerciseBike', 'exerciseBike', 'speaker']),
      room('changing', 'Vestuario', 'el', ['lockers', 'lockers', 'bench'], false),
      room('showers', 'Duchas', 'la', ['shower', 'shower', 'towelRail'], false),
      room('toilets', 'Aseos', 'el', ['toilet', 'sink'], false),
      room('reception', 'Recepción', 'la', ['checkout', 'sofa', 'plant']),
      room('cafe', 'Cafetería', 'la', ['counter', 'stool', 'table', 'fridge']),
      room('sauna', 'Sauna', 'la', ['bench', 'bench'], false),
    ],
  },
];

export function getScenario(id: string): ScenarioDef {
  const s = SCENARIOS.find((sc) => sc.id === id);
  if (!s) throw new Error(`Unknown scenario: ${id}`);
  return s;
}
