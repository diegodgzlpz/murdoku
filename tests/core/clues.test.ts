import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { clueDef, clueText, enumerateTrueClues, evaluateClue, pruneClue } from '../../src/core/clues/registry';
import type { Clue } from '../../src/core/clues/types';
import { createPeople } from '../../src/core/model/people';
import { compileModel, Propagator, State } from '../../src/core/solver/engine';
import { createRng } from '../../src/core/rng/rng';
import type { Positions } from '../../src/core/model/types';
import { handmadeBoard, handmadePuzzle, handmadeSolution } from '../fixtures/handmade';
import { randomBoard, randomPositions } from '../helpers';

const people = createPeople(6);
const text = (c: Clue) => clueText(c, handmadeBoard, people);

describe('clue texts (es)', () => {
  it('renders templates', () => {
    expect(text({ kind: 'inRoom', person: 'B', room: 3 })).toBe('Benjamín estaba en el baño.');
    expect(text({ kind: 'notInRoom', person: 'A', room: 1 })).toBe('Alba no estaba en la cocina.');
    expect(text({ kind: 'nextToFurniture', person: 'A', furniture: 'plant', room: 0 })).toBe(
      'Alba estaba al lado de una planta en el salón.',
    );
    expect(text({ kind: 'nextToFurniture', person: 'A', furniture: 'plant' })).toBe('Alba estaba al lado de una planta.');
    expect(text({ kind: 'onFurniture', person: 'D', furniture: 'chair' })).toBe('Diego estaba sentado en una silla.');
    expect(text({ kind: 'onFurniture', person: 'C', furniture: 'bed' })).toBe('Carla estaba tumbada en una cama.');
    expect(text({ kind: 'nextToWindow', person: 'D' })).toBe('Diego estaba junto a una ventana.');
    expect(text({ kind: 'byWall', person: 'E' })).toBe('Emma estaba junto a una pared.');
    expect(text({ kind: 'inCorner', person: 'E' })).toBe('Emma estaba en una esquina de la habitación.');
    expect(text({ kind: 'sameRoom', a: 'A', b: 'B' })).toBe('Alba y Benjamín estaban en la misma habitación.');
    expect(text({ kind: 'differentRoom', a: 'A', b: 'B' })).toBe('Alba y Benjamín estaban en habitaciones distintas.');
    expect(text({ kind: 'relative', a: 'D', b: 'C', dir: 'W' })).toBe('Diego estaba más al oeste que Carla.');
    expect(text({ kind: 'emptyRoomCount', count: 0 })).toBe('Ninguna habitación estaba vacía.');
    expect(text({ kind: 'emptyRoomCount', count: 2 })).toBe('Había exactamente 2 habitaciones vacías.');
    expect(text({ kind: 'inLine', person: 'B', axis: 'col', index: 5 })).toBe('Benjamín estaba en la última columna.');
    expect(text({ kind: 'inLine', person: 'B', axis: 'row', index: 0 })).toBe('Benjamín estaba en la primera fila.');
    expect(text({ kind: 'inLine', person: 'B', axis: 'row', index: 2 })).toBe('Benjamín estaba en la tercera fila.');
    expect(text({ kind: 'onlyOnFurniture', person: 'D', furniture: 'chair' })).toBe(
      'Diego era la única persona sentada en una silla.',
    );
    expect(text({ kind: 'roomWithGender', person: 'D', gender: 'm', count: 2 })).toBe(
      'Diego estaba en una habitación con dos hombres.',
    );
    expect(text({ kind: 'roomWithGender', person: 'D', gender: 'f', count: 1 })).toBe(
      'Diego estaba en una habitación con una mujer.',
    );
    // Single bed on the hand-made board -> definite article; three chairs -> indefinite.
    expect(text({ kind: 'someoneOnFurniture', furniture: 'bed' })).toBe('Alguien estaba sobre la cama.');
    expect(text({ kind: 'someoneOnFurniture', furniture: 'chair' })).toBe('Alguien estaba sobre una silla.');
  });
});

describe('clue semantics on the hand-made board', () => {
  const pos = handmadeSolution;
  const ev = (c: Clue) => evaluateClue(c, handmadeBoard, pos, people);

  it('all hand-made clues hold in the solution', () => {
    for (const c of handmadePuzzle.clues) expect(ev(c)).toBe(true);
  });

  it('furniture adjacency only counts furniture in the same room', () => {
    // E at (5,5): neighbors (4,5) e empty, (5,4) e empty -> no furniture.
    expect(ev({ kind: 'nextToFurniture', person: 'E', furniture: 'table' })).toBe(false);
    // B at (3,4): (4,4) table same room (e), (2,4) plant in room c -> not counted.
    expect(ev({ kind: 'nextToFurniture', person: 'B', furniture: 'table' })).toBe(true);
    expect(ev({ kind: 'nextToFurniture', person: 'B', furniture: 'plant' })).toBe(false);
    expect(ev({ kind: 'nextToFurniture', person: 'B', furniture: 'shelf', room: 4 })).toBe(true);
    expect(ev({ kind: 'nextToFurniture', person: 'B', furniture: 'shelf', room: 2 })).toBe(false);
  });

  it('being on furniture is not being next to it', () => {
    expect(ev({ kind: 'onFurniture', person: 'B', furniture: 'chair' })).toBe(true);
    expect(ev({ kind: 'nextToFurniture', person: 'B', furniture: 'chair' })).toBe(false);
  });

  it('windows, relative, rooms, empty count', () => {
    expect(ev({ kind: 'nextToWindow', person: 'A' })).toBe(true);
    expect(ev({ kind: 'nextToWindow', person: 'A', room: 0 })).toBe(true);
    expect(ev({ kind: 'nextToWindow', person: 'A', room: 1 })).toBe(false);
    expect(ev({ kind: 'nextToWindow', person: 'B' })).toBe(false);
    expect(ev({ kind: 'relative', a: 'A', b: 'E', dir: 'N' })).toBe(true);
    expect(ev({ kind: 'relative', a: 'A', b: 'E', dir: 'S' })).toBe(false);
    expect(ev({ kind: 'relative', a: 'E', b: 'A', dir: 'E' })).toBe(true);
    expect(ev({ kind: 'sameRoom', a: 'B', b: 'E' })).toBe(true);
    expect(ev({ kind: 'differentRoom', a: 'B', b: 'E' })).toBe(false);
    expect(ev({ kind: 'emptyRoomCount', count: 2 })).toBe(true); // cocina, comedor
  });

  it('line, uniqueness, gender and "someone" clues', () => {
    // E at (5,5): last row and last column.
    expect(ev({ kind: 'inLine', person: 'E', axis: 'row', index: 5 })).toBe(true);
    expect(ev({ kind: 'inLine', person: 'E', axis: 'col', index: 4 })).toBe(false);
    // B is the only one on a chair; C the only one on a bed; A on the sofa.
    expect(ev({ kind: 'onlyOnFurniture', person: 'B', furniture: 'chair' })).toBe(true);
    expect(ev({ kind: 'onlyOnFurniture', person: 'A', furniture: 'chair' })).toBe(false);
    expect(ev({ kind: 'someoneOnFurniture', furniture: 'bed' })).toBe(true);
    expect(ev({ kind: 'someoneOnFurniture', furniture: 'lounger' })).toBe(false);
    // Despacho holds B (m) and E (f): B shares it with one woman and no man.
    expect(ev({ kind: 'roomWithGender', person: 'B', gender: 'f', count: 1 })).toBe(true);
    expect(ev({ kind: 'roomWithGender', person: 'B', gender: 'm', count: 1 })).toBe(false);
    // Dormitorio holds C (f) and the victim Vera (f, default name): the victim counts.
    expect(ev({ kind: 'roomWithGender', person: 'C', gender: 'f', count: 1 })).toBe(true);
  });
});

/** Apply a single clue's pruner on a random partial state that still contains the solution. */
function pruneKeeps(seed: number): boolean {
  const rng = createRng(`prune-${seed}`);
  const size = rng.range(4, 7);
  const board = randomBoard(rng, size, rng.range(2, size));
  const positions = randomPositions(rng, board);
  if (!positions) return true;
  const ppl = createPeople(size);
  const suspects = ppl.filter((p) => !p.isVictim);
  const clues = enumerateTrueClues({ board, suspects, people: ppl, solution: { positions, murderer: 'A' } });
  const model = compileModel(board, ppl, []);
  for (const clue of clues) {
    if (!evaluateClue(clue, board, positions, ppl)) return false;
    const state = State.initial(model);
    // Random partial state: drop non-solution candidates with probability 0.5.
    ppl.forEach((p, i) => {
      for (let c = 0; c < model.cellCount; c++)
        if (c !== positions[p.id] && rng.chance(0.5)) {
          state.dom[i * model.cellCount + c] = 0;
          state.count[i]!--;
        }
    });
    const prop = new Propagator(model).attach(state);
    pruneClue(clue, prop);
    for (const [i, p] of ppl.entries()) if (!state.dom[i * model.cellCount + positions[p.id]!]) return false;
  }
  return true;
}

/** Unary pruners must remove exactly the cells where the clue is false. */
function unaryPruneExact(seed: number): boolean {
  const rng = createRng(`exact-${seed}`);
  const size = rng.range(4, 7);
  const board = randomBoard(rng, size, rng.range(2, size));
  const positions = randomPositions(rng, board);
  if (!positions) return true;
  const ppl = createPeople(size);
  const clues = enumerateTrueClues({
    board,
    suspects: ppl.filter((p) => !p.isVictim),
    people: ppl,
    solution: { positions, murderer: 'A' },
  }).filter((c) => clueDef(c).unary);
  const model = compileModel(board, ppl, []);
  for (const clue of clues) {
    const person = (clue as { person: string }).person;
    const pi = ppl.findIndex((p) => p.id === person);
    const state = State.initial(model);
    const prop = new Propagator(model).attach(state);
    pruneClue(clue, prop);
    for (let c = 0; c < model.cellCount; c++) {
      const kept = state.dom[pi * model.cellCount + c] === 1;
      const truth = evaluateClue(clue, board, { ...positions, [person]: c } as Positions, ppl);
      if (kept !== truth) return false;
    }
  }
  return true;
}

describe('clue pruners (property)', () => {
  it('never remove the true cell of a person', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1_000_000 }), pruneKeeps), { numRuns: 150 });
  });
  it('unary pruners are exact', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1_000_000 }), unaryPruneExact), { numRuns: 100 });
  });
  it('enumerateTrue never mentions the victim', () => {
    const rng = createRng('victim');
    for (let i = 0; i < 30; i++) {
      const board = randomBoard(rng, 6, 4);
      const positions = randomPositions(rng, board);
      if (!positions) continue;
      const ppl = createPeople(6);
      const clues = enumerateTrueClues({
        board,
        suspects: ppl.filter((p) => !p.isVictim),
        people: ppl,
        solution: { positions, murderer: 'A' },
      });
      expect(JSON.stringify(clues)).not.toMatch(/"V"/);
    }
  });
});
