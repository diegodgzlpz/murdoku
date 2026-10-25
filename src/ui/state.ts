import {
  findConflicts,
  samePositions,
  type CellIndex,
  type Conflict,
  type Level,
  type PersonId,
  type Positions,
} from '../core/index';

/** What a click on a cell does. */
export type Mode = 'place' | 'note' | 'mark' | 'erase';

/** Pure UI state (no DOM). */
export interface GameState {
  level: Level;
  placements: Partial<Positions>;
  /** Pencil marks: people the player considers possible in each cell. */
  notes: Map<CellIndex, Set<PersonId>>;
  /** Cells the player has discarded for everybody. */
  marks: Set<CellIndex>;
  selected: PersonId;
  mode: Mode;
  accusation: PersonId | null;
  message: { text: string; ok: boolean } | null;
}

export function newGame(level: Level): GameState {
  return {
    level,
    placements: {},
    notes: new Map(),
    marks: new Set(),
    selected: level.puzzle.people[0]!.id,
    mode: 'place',
    accusation: null,
    message: null,
  };
}

export function personAt(state: GameState, cell: CellIndex): PersonId | undefined {
  return Object.entries(state.placements).find(([, c]) => c === cell)?.[0];
}

function cloneNotes(notes: GameState['notes']): GameState['notes'] {
  return new Map([...notes].map(([cell, ids]) => [cell, new Set(ids)]));
}

/** Apply `mode` (defaults to the current one) to a cell. */
export function clickCell(state: GameState, cell: CellIndex, mode: Mode = state.mode): GameState {
  const placements = { ...state.placements };
  const marks = new Set(state.marks);
  const notes = cloneNotes(state.notes);
  const occupant = personAt(state, cell);
  const id = state.selected;
  switch (mode) {
    case 'place':
      if (occupant === id) delete placements[id]; // click again to remove
      else {
        if (occupant) delete placements[occupant];
        placements[id] = cell;
        marks.delete(cell);
      }
      break;
    case 'note': {
      if (occupant) break;
      const ids = notes.get(cell) ?? new Set<PersonId>();
      ids.has(id) ? ids.delete(id) : ids.add(id);
      if (ids.size) notes.set(cell, ids);
      else notes.delete(cell);
      marks.delete(cell);
      break;
    }
    case 'mark':
      if (occupant) break;
      if (marks.has(cell)) marks.delete(cell);
      else {
        marks.add(cell);
        notes.delete(cell);
      }
      break;
    case 'erase':
      if (occupant) delete placements[occupant];
      marks.delete(cell);
      notes.delete(cell);
      break;
  }
  return { ...state, placements, marks, notes, message: null };
}

export function selectPerson(state: GameState, id: PersonId): GameState {
  // Picking a person while discarding/erasing switches back to placing.
  const mode = state.mode === 'mark' || state.mode === 'erase' ? 'place' : state.mode;
  return { ...state, selected: id, mode };
}

export function conflicts(state: GameState): Conflict[] {
  return findConflicts(state.level.puzzle.board, state.placements);
}

export function check(state: GameState): GameState {
  const { puzzle, solution } = state.level;
  const missing = puzzle.people.filter((p) => state.placements[p.id] === undefined);
  let message: GameState['message'];
  if (missing.length) message = { ok: false, text: `Faltan por colocar: ${missing.map((p) => p.name).join(', ')}.` };
  else if (conflicts(state).length) message = { ok: false, text: 'Hay conflictos de fila o columna.' };
  else if (!samePositions(state.placements as Positions, solution.positions))
    message = { ok: false, text: 'La colocación no es correcta.' };
  else if (state.accusation === null) message = { ok: true, text: 'Colocación correcta. Ahora acusa al asesino.' };
  else if (state.accusation !== solution.murderer) message = { ok: false, text: 'Colocación correcta, pero has acusado a un inocente.' };
  else {
    const m = puzzle.people.find((p) => p.id === solution.murderer)!;
    message = { ok: true, text: `¡Caso resuelto! ${m.name} es el asesino.` };
  }
  return { ...state, message };
}
