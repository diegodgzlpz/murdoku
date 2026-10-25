import type { Board, Person, PersonId, Positions } from '../model/types';
import type { ClueDef, EnumerateContext, PruneContext } from './clueDef';
import { emptyRoomCount } from './defs/emptyRooms';
import { onlyOnFurniture, someoneOnFurniture } from './defs/furnitureCount';
import { roomWithGender } from './defs/gender';
import { inLine } from './defs/lines';
import { nextToFurniture, onFurniture } from './defs/furniture';
import { differentRoom, relative, sameRoom } from './defs/pairs';
import { inRoom, notInRoom } from './defs/room';
import { byWall, inCorner, nextToWindow } from './defs/walls';
import type { Clue, ClueKind, ClueOfKind } from './types';

/**
 * Registry of clue kinds. Adding a kind: add it to the Clue union, write its ClueDef, register it here
 * (the mapped type makes a missing entry a compile error).
 */
export const CLUE_DEFS: { [K in ClueKind]: ClueDef<ClueOfKind<K>> } = {
  inRoom,
  notInRoom,
  nextToFurniture,
  onFurniture,
  nextToWindow,
  byWall,
  inCorner,
  sameRoom,
  differentRoom,
  relative,
  emptyRoomCount,
  inLine,
  onlyOnFurniture,
  roomWithGender,
  someoneOnFurniture,
};

export const CLUE_KINDS = Object.keys(CLUE_DEFS) as ClueKind[];

export function clueDef<C extends Clue>(clue: C): ClueDef<C> {
  return CLUE_DEFS[clue.kind] as unknown as ClueDef<C>;
}

export function evaluateClue(clue: Clue, board: Board, positions: Positions, people: Person[]): boolean {
  return clueDef(clue).evaluate(clue, board, positions, people);
}

export function pruneClue(clue: Clue, ctx: PruneContext): void {
  clueDef(clue).prune(clue, ctx);
}

export function clueText(clue: Clue, board: Board, people: Person[]): string {
  const person = (id: PersonId): Person => {
    const p = people.find((x) => x.id === id);
    if (!p) throw new Error(`Unknown person ${id}`);
    return p;
  };
  return clueDef(clue).text(clue, { board, person });
}

export function cluePersons(clue: Clue): PersonId[] {
  return clueDef(clue).persons(clue);
}

export function enumerateTrueClues(ctx: EnumerateContext): Clue[] {
  return CLUE_KINDS.flatMap((k) => CLUE_DEFS[k].enumerateTrue(ctx) as Clue[]);
}
