import { describe, expect, it } from 'vitest';
import { isByWall, isRoomCorner } from '../../src/core/clues/defs/walls';
import { cellIndex, isAdjacent, orthogonalNeighbors } from '../../src/core/model/geometry';
import { createRng } from '../../src/core/rng/rng';
import { handmadeBoard } from '../fixtures/handmade';

const at = (r: number, c: number) => cellIndex(r, c, 6);

describe('geometry', () => {
  it('adjacency is orthogonal only', () => {
    expect(orthogonalNeighbors(at(2, 2), 6).sort((a, b) => a - b)).toEqual([at(1, 2), at(2, 1), at(2, 3), at(3, 2)]);
    expect(isAdjacent(at(2, 2), at(3, 3), 6)).toBe(false); // diagonal
    expect(isAdjacent(at(0, 5), at(1, 0), 6)).toBe(false); // no row wrap
    expect(orthogonalNeighbors(at(0, 0), 6)).toHaveLength(2);
  });

  it('room corners need two perpendicular walls', () => {
    // Salón: a a a / a a . / . a .
    expect(isRoomCorner(handmadeBoard, at(0, 0))).toBe(true); // N + W board edges
    expect(isRoomCorner(handmadeBoard, at(0, 2))).toBe(true); // N edge + E wall
    expect(isRoomCorner(handmadeBoard, at(0, 1))).toBe(false); // only N
    expect(isRoomCorner(handmadeBoard, at(1, 1))).toBe(false); // E wall only (S is same room)
    expect(isRoomCorner(handmadeBoard, at(2, 1))).toBe(true); // W, E, S walls
  });

  it('byWall: any side on a room wall', () => {
    expect(isByWall(handmadeBoard, at(1, 1))).toBe(true);
    // Despacho (e) interior-ish cell (4,5): E board edge -> by wall. (4,4)? N=(3,4) e, S=(5,4) e, W=(4,3) f -> wall.
    expect(isByWall(handmadeBoard, at(4, 4))).toBe(true);
  });
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng('abc');
    const b = createRng('abc');
    const xs = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(xs);
    expect(createRng('abd').next()).not.toBe(xs[0]);
  });

  it('int stays in range', () => {
    const r = createRng('x');
    for (let i = 0; i < 1000; i++) {
      const v = r.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
});
