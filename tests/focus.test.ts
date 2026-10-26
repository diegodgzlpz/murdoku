import { describe, expect, it } from 'vitest';
import { clueFocusCells, generateLevel, type Clue } from '../src/core/index';

const level = generateLevel({ size: 7, seed: 'focus', scenarioId: 'house', difficulty: 'medium' });
const { board } = level.puzzle;

describe('clue focus cells', () => {
  it('furniture clues point at every piece of that type', () => {
    const f = board.furniture[0]!;
    const clue: Clue = { kind: 'someoneOnFurniture', furniture: f.type };
    const cells = clueFocusCells(clue, board);
    expect(cells).toContain(f.cell);
    for (const c of cells) expect(board.furniture.find((x) => x.cell === c)?.type).toBe(f.type);
  });

  it('room clues point at the room, line clues at the row or column', () => {
    const room = board.rooms[1]!;
    expect(clueFocusCells({ kind: 'notInRoom', person: 'A', room: room.id }, board)).toEqual(room.cells);
    expect(clueFocusCells({ kind: 'inLine', person: 'A', axis: 'col', index: 2 }, board)).toEqual(
      Array.from({ length: 7 }, (_, r) => r * 7 + 2),
    );
  });

  it('every generated clue gets valid cells', () => {
    for (const clue of level.puzzle.clues)
      for (const c of clueFocusCells(clue, board)) expect(c >= 0 && c < 49).toBe(true);
  });
});
