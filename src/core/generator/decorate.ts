import { isOuterSide, SIDES } from '../model/geometry';
import type { Board, Furniture, Room, RoomId, WindowEdge } from '../model/types';
import type { Rng } from '../rng/rng';
import type { RoomTypeDef, ScenarioDef } from '../scenarios/catalog';
import { FURNITURE } from '../scenarios/furniture';

export interface DecorateOptions {
  /** Fraction range of each room's cells that get furniture. */
  furnitureDensity: [number, number];
  /** Probability that an eligible exterior side gets a window. */
  windowChance: number;
}

export const DEFAULT_DECORATE: DecorateOptions = { furnitureDensity: [0.2, 0.4], windowChance: 0.15 };

/** Assigns room types/names, furniture and windows to a partition. */
export function decorate(
  rng: Rng,
  size: number,
  roomOf: RoomId[],
  scenario: ScenarioDef,
  opts: DecorateOptions = DEFAULT_DECORATE,
): Board {
  const roomCount = Math.max(...roomOf) + 1;
  const types = rng.shuffle(scenario.rooms);
  const usedNames = new Map<string, number>();
  const roomTypes: RoomTypeDef[] = [];
  const rooms: Room[] = Array.from({ length: roomCount }, (_, id) => {
    const type = types[id % types.length]!;
    roomTypes.push(type);
    const n = (usedNames.get(type.id) ?? 0) + 1;
    usedNames.set(type.id, n);
    return {
      id,
      typeId: type.id,
      name: n === 1 ? type.name : `${type.name} ${n}`,
      article: type.article,
      cells: roomOf.flatMap((r, c) => (r === id ? [c] : [])),
    };
  });

  const furniture: Furniture[] = [];
  for (const room of rooms) {
    const type = roomTypes[room.id]!;
    const [lo, hi] = opts.furnitureDensity;
    const count = Math.round(room.cells.length * (lo + rng.next() * (hi - lo)));
    let blocked = 0;
    for (const cell of rng.shuffle(room.cells).slice(0, count)) {
      const ft = rng.pick(type.furniture);
      const occupiable = FURNITURE[ft].occupiable;
      // Keep at least 2 free cells per room so it can host the victim and the murderer.
      if (!occupiable && room.cells.length - (blocked + 1) < 2) continue;
      if (!occupiable) blocked++;
      furniture.push({ cell, type: ft, occupiable });
    }
  }

  const windows: WindowEdge[] = [];
  for (let cell = 0; cell < size * size; cell++) {
    if (!roomTypes[roomOf[cell]!]!.windows) continue;
    for (const side of SIDES) if (isOuterSide(cell, side, size) && rng.chance(opts.windowChance)) windows.push({ cell, side });
  }

  return { size, roomOf, rooms, furniture, windows };
}
