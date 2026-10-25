import type { Clue } from '../src/core/clues/types';
import { cellIndex, neighborAt, orthogonalNeighbors } from '../src/core/model/geometry';
import { isBlocked } from '../src/core/model/boardIndex';
import { createPeople } from '../src/core/model/people';
import { placementViolations } from '../src/core/model/rules';
import type { Board, FurnitureType, Positions, Puzzle, Side } from '../src/core/model/types';
import { FURNITURE } from '../src/core/scenarios/furniture';

/** Build a board from an ASCII room map: one char per cell, same char = same room. */
export function boardFromAscii(
  map: string[],
  roomNames: Record<string, [name: string, article: 'el' | 'la']>,
  furniture: Array<[row: number, col: number, type: FurnitureType]> = [],
  windows: Array<[row: number, col: number, side: Side]> = [],
): Board {
  const size = map.length;
  const chars = Object.keys(roomNames);
  const roomOf: number[] = [];
  for (const line of map) {
    if (line.length !== size) throw new Error('map must be square');
    for (const ch of line) {
      const id = chars.indexOf(ch);
      if (id < 0) throw new Error(`no room for ${ch}`);
      roomOf.push(id);
    }
  }
  return {
    size,
    roomOf,
    rooms: chars.map((ch, id) => ({
      id,
      typeId: ch,
      name: roomNames[ch]![0],
      article: roomNames[ch]![1],
      cells: roomOf.flatMap((r, c) => (r === id ? [c] : [])),
    })),
    furniture: furniture.map(([r, c, type]) => ({
      cell: cellIndex(r, c, size),
      type,
      occupiable: FURNITURE[type].occupiable,
    })),
    windows: windows.map(([r, c, side]) => ({ cell: cellIndex(r, c, size), side })),
  };
}

export function makePuzzle(board: Board, clues: Clue[]): Puzzle {
  return { schemaVersion: 1, scenarioId: 'test', board, people: createPeople(board.size), clues };
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const rest of permutations(n - 1))
    for (let i = 0; i <= rest.length; i++) out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)]);
  return out;
}

/** Independent reference solver: tries every placement. Only for small N (≤ 6). */
export function bruteForceSolutions(puzzle: Puzzle, limit = Infinity): Positions[] {
  const n = puzzle.board.size;
  const perms = permutations(n);
  const found: Positions[] = [];
  for (const colOfRow of perms) {
    const cells = colOfRow.map((c, r) => cellIndex(r, c, n));
    for (const who of perms) {
      const positions: Positions = {};
      puzzle.people.forEach((p, i) => (positions[p.id] = cells[who[i]!]!));
      if (placementViolations(puzzle, positions).length === 0) {
        found.push(positions);
        if (found.length >= limit) return found;
      }
    }
  }
  return found;
}

/** Simple random board for solver property tests (independent from the real generator). */
export function randomBoard(rng: import('../src/core/rng/rng').Rng, size: number, roomCount: number): Board {
  const cells = size * size;
  const roomOf = new Array<number>(cells).fill(-1);
  const seeds = rng.shuffle([...Array(cells).keys()]).slice(0, roomCount);
  seeds.forEach((c, i) => (roomOf[c] = i));
  let unassigned = cells - roomCount;
  while (unassigned > 0) {
    const c = rng.int(cells);
    if (roomOf[c] !== -1) continue;
    const ns = orthogonalNeighbors(c, size).filter((n) => roomOf[n]! >= 0);
    if (ns.length === 0) continue;
    roomOf[c] = roomOf[rng.pick(ns)]!;
    unassigned--;
  }
  const types: FurnitureType[] = ['chair', 'bed', 'rug', 'plant', 'table', 'shelf'];
  const furniture = rng
    .shuffle([...Array(cells).keys()])
    .slice(0, Math.floor(cells / 5))
    .map((cell) => {
      const type = rng.pick(types);
      return { cell, type, occupiable: FURNITURE[type].occupiable };
    });
  const windows: Board['windows'] = [];
  for (let c = 0; c < cells; c++)
    for (const side of ['N', 'S', 'E', 'W'] as Side[])
      if (neighborAt(c, side, size) === null && rng.chance(0.15)) windows.push({ cell: c, side });
  return {
    size,
    roomOf,
    rooms: Array.from({ length: roomCount }, (_, id) => ({
      id,
      typeId: `r${id}`,
      name: `Sala ${id}`,
      article: 'la' as const,
      cells: roomOf.flatMap((r, c) => (r === id ? [c] : [])),
    })),
    furniture,
    windows,
  };
}

/** Random placement (one per row/col, not on blocked cells); murderer rule not enforced. */
export function randomPositions(rng: import('../src/core/rng/rng').Rng, board: Board): Positions | null {
  const n = board.size;
  for (let attempt = 0; attempt < 50; attempt++) {
    const cols = rng.shuffle([...Array(n).keys()]);
    const cells = cols.map((c, r) => cellIndex(r, c, n));
    if (cells.some((c) => isBlocked(board, c))) continue;
    const order = rng.shuffle(cells);
    const people = createPeople(n);
    const positions: Positions = {};
    people.forEach((p, i) => (positions[p.id] = order[i]!));
    return positions;
  }
  return null;
}
