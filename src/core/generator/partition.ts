import { orthogonalNeighbors } from '../model/geometry';
import type { RoomId } from '../model/types';
import type { Rng } from '../rng/rng';

export interface PartitionOptions {
  roomCount: number;
  minRoomSize: number;
  maxRoomSize: number;
}

/**
 * Splits the grid into `roomCount` contiguous, irregular regions by random region growing.
 * Returns roomOf (cell -> room) or null when the size constraints could not be met.
 */
export function partitionRooms(rng: Rng, size: number, opts: PartitionOptions): RoomId[] | null {
  const cells = size * size;
  const { roomCount, minRoomSize, maxRoomSize } = opts;
  if (roomCount * minRoomSize > cells || roomCount * maxRoomSize < cells) return null;

  const roomOf = new Array<number>(cells).fill(-1);
  const sizes = new Array<number>(roomCount).fill(0);

  // Spread seeds: prefer cells far from existing seeds (best of a few random tries).
  const seeds: number[] = [];
  for (let r = 0; r < roomCount; r++) {
    let best = -1;
    let bestDist = -1;
    for (let t = 0; t < 8; t++) {
      const c = rng.int(cells);
      if (roomOf[c] !== -1) continue;
      const d = seeds.length
        ? Math.min(...seeds.map((s) => Math.abs((s % size) - (c % size)) + Math.abs(Math.floor(s / size) - Math.floor(c / size))))
        : 0;
      if (d > bestDist) {
        best = c;
        bestDist = d;
      }
    }
    if (best < 0) return null;
    seeds.push(best);
    roomOf[best] = r;
    sizes[r] = 1;
  }

  const frontier = (r: number): number[] => {
    const out = new Set<number>();
    for (let c = 0; c < cells; c++)
      if (roomOf[c] === r) for (const n of orthogonalNeighbors(c, size)) if (roomOf[n] === -1) out.add(n);
    return [...out];
  };

  let unassigned = cells - roomCount;
  while (unassigned > 0) {
    // Pick a growable room, favouring small rooms so sizes stay varied but bounded.
    const growable: number[] = [];
    const weights: number[] = [];
    const fronts: number[][] = [];
    for (let r = 0; r < roomCount; r++) {
      if (sizes[r]! >= maxRoomSize) continue;
      const f = frontier(r);
      if (!f.length) continue;
      growable.push(r);
      fronts.push(f);
      weights.push(maxRoomSize - sizes[r]! + rng.next() * 2);
    }
    if (!growable.length) break;
    const total = weights.reduce((a, b) => a + b, 0);
    let x = rng.next() * total;
    let i = 0;
    while (i < weights.length - 1 && (x -= weights[i]!) > 0) i++;
    const room = growable[i]!;
    const cell = rng.pick(fronts[i]!);
    roomOf[cell] = room;
    sizes[room]!++;
    unassigned--;
  }

  // Leftover pockets (all neighbours full): attach to a neighbouring room, then validate sizes.
  while (unassigned > 0) {
    let progressed = false;
    for (let c = 0; c < cells; c++) {
      if (roomOf[c] !== -1) continue;
      const ns = orthogonalNeighbors(c, size).filter((n) => roomOf[n]! >= 0);
      if (!ns.length) continue;
      const room = roomOf[rng.pick(ns)]!;
      roomOf[c] = room;
      sizes[room]!++;
      unassigned--;
      progressed = true;
    }
    if (!progressed) return null;
  }

  if (sizes.some((s) => s < minRoomSize || s > maxRoomSize)) return null;
  return roomOf;
}

/** Contiguity check used by invariants. */
export function isContiguous(cells: number[], size: number): boolean {
  if (!cells.length) return false;
  const set = new Set(cells);
  const seen = new Set([cells[0]!]);
  const stack = [cells[0]!];
  while (stack.length) {
    const c = stack.pop()!;
    for (const n of orthogonalNeighbors(c, size))
      if (set.has(n) && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
  }
  return seen.size === set.size;
}
