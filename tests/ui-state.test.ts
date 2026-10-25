import { describe, expect, it } from 'vitest';
import { generateLevel } from '../src/core/index';
import { check, clickCell, conflicts, newGame, toggleMark } from '../src/ui/state';

const level = generateLevel({ size: 6, seed: 'ui', scenarioId: 'house', difficulty: 'easy' });

describe('ui state (no DOM)', () => {
  it('places, moves and removes people', () => {
    let s = newGame(level);
    s = clickCell(s, 0);
    expect(s.placements.A).toBe(0);
    s = clickCell(s, 1);
    expect(s.placements.A).toBe(1);
    s = clickCell(s, 1);
    expect(s.placements.A).toBeUndefined();
  });

  it('flags row conflicts in real time', () => {
    let s = newGame(level);
    s = clickCell(s, 0);
    s = { ...s, tool: { kind: 'person', id: 'B' } };
    s = clickCell(s, 1);
    expect(conflicts(s).some((c) => c.kind === 'row')).toBe(true);
  });

  it('marks cells as discarded', () => {
    let s = toggleMark(newGame(level), 5);
    expect(s.marks.has(5)).toBe(true);
    s = toggleMark(s, 5);
    expect(s.marks.has(5)).toBe(false);
  });

  it('final check: correct placement + correct accusation', () => {
    let s = newGame(level);
    expect(check(s).message?.ok).toBe(false);
    s = { ...s, placements: { ...level.solution.positions } };
    expect(check(s).message?.text).toMatch(/acusa/);
    const innocent = level.puzzle.people.find((p) => !p.isVictim && p.id !== level.solution.murderer)!.id;
    expect(check({ ...s, accusation: innocent }).message?.ok).toBe(false);
    expect(check({ ...s, accusation: level.solution.murderer }).message?.ok).toBe(true);
  });
});
