import { describe, expect, it } from 'vitest';
import { castForSeed, generateLevel, NAME_POOLS, puzzleClueGroups, VICTIM_NAMES } from '../src/core/index';
import { AVATAR_COUNT, assignAvatars, avatarSvg } from '../src/ui/avatars';
import { check, clickCell, conflicts, crossedCells, hint, newGame, undo, reviewPlacements, selectPerson, toggleSolution, type GameState } from '../src/ui/state';

const level = generateLevel({ size: 6, seed: 'ui', scenarioId: 'house', difficulty: 'easy' });
const n = level.puzzle.board.size;
const blockedCells = new Set(level.puzzle.board.furniture.filter((f) => !f.occupiable).map((f) => f.cell));
/** Two free cells sharing a row, plus another free cell. */
const row = Array.from({ length: n }, (_, r) => r).find(
  (r) => Array.from({ length: n }, (_, c) => r * n + c).filter((c) => !blockedCells.has(c)).length >= 3,
)!;
const [c0, c1, c4] = Array.from({ length: n }, (_, c) => row * n + c).filter((c) => !blockedCells.has(c)) as [number, number, number];

describe('ui state (no DOM)', () => {
  it('places, moves and removes people (hold = place)', () => {
    let s = newGame(level);
    s = clickCell(s, c0, 'place');
    expect(s.placements.A).toBe(c0);
    expect(s.selected).toBe('B'); // moves on to the next person off the board
    s = clickCell(selectPerson(s, 'A'), c1, 'place');
    expect(s.placements.A).toBe(c1);
    s = clickCell(s, c1, 'place');
    expect(s.placements.A).toBeUndefined();
  });

  it('flags row conflicts in real time', () => {
    let s = clickCell(newGame(level), c0, 'place');
    s = clickCell(selectPerson(s, 'B'), c1, 'place');
    expect(conflicts(s).some((c) => c.kind === 'row')).toBe(true);
  });

  it('undo steps back through board changes only', () => {
    let s = clickCell(newGame(level), c0, 'note');
    s = clickCell(s, c1, 'place');
    expect(clickCell(s, blockedCells.values().next().value!, 'place').history.length).toBe(2);
    s = undo(s);
    expect(s.placements.A).toBeUndefined();
    expect(s.notes.get(c0)?.has('A')).toBe(true);
    s = undo(s);
    expect(s.notes.size).toBe(0);
    expect(undo(s).message?.ok).toBe(false);
  });

  it('hint: names the next deducible person, then reveals the cell; flags misplaced people first', () => {
    let s = hint(newGame(level));
    expect(s.hint).not.toBeNull();
    expect(s.hint!.cell).toBe(level.solution.positions[s.hint!.person]);
    expect(s.hint!.revealed).toBe(false);
    expect(s.selected).toBe(s.hint!.person); // ready to hold-place the hinted person
    s = hint(s);
    expect(s.hint!.revealed).toBe(true);
    const id = level.puzzle.people[0]!.id;
    const wrongCell = [c0, c1].find((c) => c !== level.solution.positions[id])!;
    s = hint(clickCell(newGame(level), wrongCell, 'place'));
    expect(s.hint!.person).toBe(id);
    expect(s.message?.text).toMatch(/no está en su sitio/);
    const solved = hint({ ...newGame(level), placements: { ...level.solution.positions } });
    expect(solved.hint).toBeNull();
    expect(solved.message?.text).toMatch(/acusa/);
  });

  it('a tap in play mode writes a pencil note: several people per cell, toggle on/off', () => {
    let s = newGame(level);
    s = clickCell(s, c0);
    s = clickCell(selectPerson(s, 'C'), c0);
    expect([...s.notes.get(c0)!].sort()).toEqual(['A', 'C']);
    expect(s.placements.A).toBeUndefined();
    s = clickCell(s, c0);
    expect([...s.notes.get(c0)!]).toEqual(['A']);
    s = clickCell(s, c0, 'erase');
    expect(s.notes.has(c0)).toBe(false);
  });

  it('discarding a cell clears its notes', () => {
    let s = clickCell(newGame(level), c4, 'note');
    expect(s.notes.get(c4)?.has('A')).toBe(true);
    s = clickCell(s, c4, 'mark');
    expect(s.marks.has(c4)).toBe(true);
    expect(s.notes.has(c4)).toBe(false);
    s = clickCell(s, c4, 'mark');
    expect(s.marks.has(c4)).toBe(false);
  });

  it('cells with blocking furniture ignore every action', () => {
    const blocked = level.puzzle.board.furniture.find((f) => !f.occupiable)!.cell;
    const s = newGame(level);
    for (const a of ['place', 'note', 'mark', 'erase'] as const) expect(clickCell(s, blocked, a)).toBe(s);
  });

  it('placing someone crosses out the rest of their row and column; no notes there', () => {
    const cell = c0;
    let s = clickCell(newGame(level), cell, 'place');
    const crossed = crossedCells(s);
    expect(crossed.has(cell)).toBe(false);
    for (const c of crossed) expect(Math.floor(c / n) === Math.floor(cell / n) || c % n === cell % n).toBe(true);
    const target = [...crossed][0]!;
    expect(clickCell(selectPerson(s, 'B'), target).notes.has(target)).toBe(false);
    s = clickCell(selectPerson(s, 'A'), cell, 'place');
    expect(crossedCells(s).size).toBe(0);
  });

  it('selecting a person leaves mark/erase mode', () => {
    const s = selectPerson({ ...newGame(level), mode: 'mark' }, 'B');
    expect(s.mode).toBe('play');
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

describe('cast and avatars', () => {
  it('draws one name per letter from its pool, deterministic by seed', () => {
    const seeds = Array.from({ length: 40 }, (_, i) => `cast-${i}`);
    const genders = new Set<string>();
    for (const seed of seeds) {
      const cast = castForSeed(9, seed);
      expect(castForSeed(9, seed)).toEqual(cast);
      for (const p of cast) {
        expect(p.name[0]!.normalize('NFD')[0]).toBe(p.id);
        expect(NAME_POOLS[p.id]).toContainEqual({ name: p.name, gender: p.gender });
        genders.add(`${p.id}${p.gender}`);
      }
    }
    // Both genders show up for every letter across seeds.
    expect(genders.size).toBe(18);
    const names = new Set(seeds.map((s) => castForSeed(9, s).map((p) => p.name).join()));
    expect(names.size).toBeGreaterThan(30);
  });

  it('generated levels use the seeded cast', () => {
    const lvl = generateLevel({ size: 7, seed: 'cast-lvl', scenarioId: 'house', difficulty: 'medium' });
    expect(lvl.puzzle.people).toEqual(castForSeed(7, 'cast-lvl'));
  });

  it('assigns distinct avatars within each gender and renders an SVG', () => {
    for (let i = 0; i < 40; i++) {
      const cast = castForSeed(9, `av-${i}`);
      const avatars = assignAvatars(cast);
      for (const g of ['f', 'm'] as const) {
        const group = cast.filter((p) => p.gender === g);
        const used = new Set(group.map((p) => avatars.get(p.id)));
        expect(used.size).toBe(Math.min(group.length, AVATAR_COUNT[g]));
      }
    }
    for (const g of ['f', 'm'] as const)
      for (let v = 0; v < AVATAR_COUNT[g]; v++) expect(avatarSvg(g, v, '#123456')).toMatch(/^<svg[\s\S]*#123456[\s\S]*<\/svg>$/);
  });
});

describe('solution view', () => {
  it('reviews placements and toggles the overlay', () => {
    const sol = level.solution.positions;
    const [a, b] = level.puzzle.people;
    const wrongCell = (sol[b!.id]! + 1) % (level.puzzle.board.size ** 2);
    let s: GameState = { ...newGame(level), placements: { [a!.id]: sol[a!.id]!, [b!.id]: wrongCell } };
    const r = reviewPlacements(s);
    expect(r.correct).toEqual([a!.id]);
    expect(r.wrong).toEqual([b!.id]);
    expect(r.missing).toHaveLength(level.puzzle.people.length - 2);
    s = toggleSolution(s);
    expect(s.showSolution).toBe(true);
    expect(s.message?.ok).toBe(false);
    expect(s.message?.text).toContain('Mal colocadas');
    s = toggleSolution(s);
    expect(s.showSolution).toBe(false);
    expect(s.message).toBeNull();
  });
});

describe('row/column clues', () => {
  it('a person never gets both a row and a column clue', () => {
    for (let i = 0; i < 30; i++) {
      const lvl = generateLevel({ size: 6 + (i % 4), seed: `line-${i}`, scenarioId: 'house', difficulty: 'easy' });
      const people = lvl.puzzle.clues.flatMap((c) => (c.kind === 'inLine' ? [c.person] : []));
      expect(new Set(people).size, `seed line-${i}`).toBe(people.length);
    }
  });
});
