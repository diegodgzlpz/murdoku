import type { FurnitureType, Gender, PersonId, RoomId } from '../model/types';

export type Direction = 'N' | 'S' | 'E' | 'W';

export interface InRoomClue {
  kind: 'inRoom';
  person: PersonId;
  room: RoomId;
}
export interface NotInRoomClue {
  kind: 'notInRoom';
  person: PersonId;
  room: RoomId;
}
/** Orthogonally next to a furniture piece of that type in the person's own room. */
export interface NextToFurnitureClue {
  kind: 'nextToFurniture';
  person: PersonId;
  furniture: FurnitureType;
  /** The person's room (furniture is always in the same room). Omitted = any room. */
  room?: RoomId;
}
/** Standing/sitting/lying on an occupiable furniture piece. */
export interface OnFurnitureClue {
  kind: 'onFurniture';
  person: PersonId;
  furniture: FurnitureType;
}
/** The person's cell has a window on one of its sides. */
export interface NextToWindowClue {
  kind: 'nextToWindow';
  person: PersonId;
  room?: RoomId;
}
/** At least one side of the person's cell is a wall of their room (board edge counts). */
export interface ByWallClue {
  kind: 'byWall';
  person: PersonId;
}
/** Two perpendicular sides of the person's cell are walls of their room. */
export interface InCornerClue {
  kind: 'inCorner';
  person: PersonId;
}
export interface SameRoomClue {
  kind: 'sameRoom';
  a: PersonId;
  b: PersonId;
}
export interface DifferentRoomClue {
  kind: 'differentRoom';
  a: PersonId;
  b: PersonId;
}
/** a is strictly further `dir` than b (any distance). */
export interface RelativeClue {
  kind: 'relative';
  a: PersonId;
  b: PersonId;
  dir: Direction;
}
/** Exactly `count` rooms contain nobody. */
export interface EmptyRoomCountClue {
  kind: 'emptyRoomCount';
  count: number;
}

/** In row/column `index` (0 = north row / west column). */
export interface InLineClue {
  kind: 'inLine';
  person: PersonId;
  axis: 'row' | 'col';
  index: number;
}
/** On furniture of that type, and nobody else (victim included) is on furniture of that type. */
export interface OnlyOnFurnitureClue {
  kind: 'onlyOnFurniture';
  person: PersonId;
  furniture: FurnitureType;
}
/** Exactly `count` OTHER people of `gender` (victim included) share the person's room. */
export interface RoomWithGenderClue {
  kind: 'roomWithGender';
  person: PersonId;
  gender: Gender;
  count: number;
}
/** At least one person (anyone, victim included) is on furniture of that type. */
export interface SomeoneOnFurnitureClue {
  kind: 'someoneOnFurniture';
  furniture: FurnitureType;
}

export type Clue =
  | InRoomClue
  | NotInRoomClue
  | NextToFurnitureClue
  | OnFurnitureClue
  | NextToWindowClue
  | ByWallClue
  | InCornerClue
  | SameRoomClue
  | DifferentRoomClue
  | RelativeClue
  | EmptyRoomCountClue
  | InLineClue
  | OnlyOnFurnitureClue
  | RoomWithGenderClue
  | SomeoneOnFurnitureClue;

export type ClueKind = Clue['kind'];
export type ClueOfKind<K extends ClueKind> = Extract<Clue, { kind: K }>;
