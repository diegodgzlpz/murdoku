import type { Clue } from '../clues/types';

/** Cell index: row * size + col. Row 0 is north, col 0 is west. */
export type CellIndex = number;
export type RoomId = number;
/** 'A'..'H' for suspects, 'V' for the victim. */
export type PersonId = string;
export type Side = 'N' | 'S' | 'E' | 'W';
export type Gender = 'f' | 'm';

export type FurnitureType =
  | 'bed'
  | 'chair'
  | 'rug'
  | 'sofa'
  | 'stool'
  | 'lounger'
  | 'bench'
  | 'plant'
  | 'tv'
  | 'shelf'
  | 'table'
  | 'fridge'
  | 'counter'
  | 'piano'
  | 'speaker'
  | 'bathtub'
  | 'wardrobe'
  | 'umbrella'
  | 'rack'
  | 'armchair'
  | 'toilet'
  | 'shower'
  | 'treadmill'
  | 'exerciseBike'
  | 'weightBench'
  | 'yogaMat'
  | 'rowingMachine'
  | 'sink'
  | 'washer'
  | 'towelRail'
  | 'laundryBasket'
  | 'display'
  | 'checkout'
  | 'cart'
  | 'clothesTable'
  | 'mannequin'
  | 'basket'
  | 'securityGate'
  | 'dumbbellRack'
  | 'punchingBag'
  | 'kettlebells'
  | 'lockers';

export interface Room {
  id: RoomId;
  /** Catalog room type, e.g. 'kitchen'. */
  typeId: string;
  /** Visible name, e.g. 'Cocina'. Unique within a board. */
  name: string;
  /** Spanish definite article for sentences: 'en la cocina'. */
  article: 'el' | 'la';
  cells: CellIndex[];
}

export interface Furniture {
  cell: CellIndex;
  type: FurnitureType;
  /** Copied from the catalog so the JSON is self-contained. */
  occupiable: boolean;
}

/** A window on an exterior side of a border cell. */
export interface WindowEdge {
  cell: CellIndex;
  side: Side;
}

export interface Board {
  size: number;
  /** Length size*size; room of every cell. */
  roomOf: RoomId[];
  rooms: Room[];
  furniture: Furniture[];
  windows: WindowEdge[];
}

export interface Person {
  id: PersonId;
  name: string;
  /** Grammatical gender, only used for Spanish text agreement. */
  gender: Gender;
  isVictim: boolean;
}

export interface Puzzle {
  schemaVersion: 1;
  scenarioId: string;
  board: Board;
  /** N people: N-1 suspects + the victim. */
  people: Person[];
  /** Clues never mention the victim; the victim's fixed clue is the murderer rule itself. */
  clues: Clue[];
}

export type Positions = Record<PersonId, CellIndex>;

export interface Solution {
  positions: Positions;
  murderer: PersonId;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GenerationParams {
  size: number;
  seed: string;
  scenarioId: string;
  difficulty: Difficulty;
}

export interface LevelStats {
  attempts: number;
  ms: number;
  /** Number of guesses the solver needed (0 = solvable by propagation only). */
  guesses: number;
}

export interface Level {
  puzzle: Puzzle;
  solution: Solution;
  params: GenerationParams;
  stats: LevelStats;
}

export const VICTIM_ID: PersonId = 'V';
