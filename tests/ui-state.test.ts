import { describe, expect, it } from 'vitest';
import { generateLevel, puzzleClueGroups, VICTIM_NAMES } from '../src/core/index';
import { check, clickCell, conflicts, newGame, selectPerson, type GameState } from '../src/ui/state';

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
    let s = clickCell(newGame(level), 0);
    s = clickCell(selectPerson(s, 'B'), 1);
    expect(conflicts(s).some((c) => c.kind === 'row')).toBe(true);
  });

  it('pencil notes: several people per cell, toggle on/off', () => {
    let s: GameState = { ...newGame(level), mode: 'note' };
    s = clickCell(s, 3);
    s = clickCell(selectPerson(s, 'C'), 3);
    expect([...s.notes.get(3)!].sort()).toEqual(['A', 'C']);
    s = clickCell(s, 3);
    expect([...s.notes.get(3)!]).toEqual(['A']);
    s = clickCell(s, 3, 'erase');
    expect(s.notes.has(3)).toBe(false);
  });

  it('discarding a cell clears its notes; shift-style override mode works', () => {
    let s = clickCell(newGame(level), 4, 'note');
    expect(s.notes.get(4)?.has('A')).toBe(true);
    expect(s.placements.A).toBeUndefined();
    s = clickCell(s, 4, 'mark');
    expect(s.marks.has(4)).toBe(true);
    expect(s.notes.has(4)).toBe(false);
    s = clickCell(s, 4, 'mark');
    expect(s.marks.has(4)).toBe(false);
  });

  it('selecting a person leaves mark/erase mode', () => {
    const s = selectPerson({ ...newGame(level), mode: 'mark' }, 'B');
    expect(s.mode).toBe('place');
    expect(s.selected).toBe('B');
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

describe('clue groups', () => {
  it('orders A, B, C… then General then the victim; each clue once', () => {
    for (const seed of ['g1', 'g2', 'g3', 'g4']) {
      const lvl = generateLevel({ size: 7, seed, scenarioId: 'mall', difficulty: 'hard' });
      const groups = puzzleClueGroups(lvl.puzzle);
      const ids = groups.map((g) => g.person?.id ?? '*');
      const suspects = ids.filter((id) => id !== '*' && id !== 'V');
      expect(suspects).toEqual([...suspects].sort());
      expect(suspects).toHaveLength(6);
      expect(ids.at(-1)).toBe('V');
      const indices = groups.flatMap((g) => g.lines.map((l) => l.clueIndex)).filter((i) => i !== null);
      expect(indices.sort((a, b) => a! - b!)).toEqual(lvl.puzzle.clues.map((_, i) => i));
    }
  });

  it('victim has a V name chosen by seed', () => {
    const victim = level.puzzle.people.find((p) => p.isVictim)!;
    expect(victim.id).toBe('V');
    expect(VICTIM_NAMES.map((v) => v.name)).toContain(victim.name);
    expect(victim.name.startsWith('V')).toBe(true);
  });
});
