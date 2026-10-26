import {
  colOf,
  findConflicts,
  isBlocked,
  rowOf,
  samePositions,
  type CellIndex,
  type Conflict,
  type Level,
  type PersonId,
  type Positions,
} from '../core/index';

/** Board tool: 'play' = tap for a pencil note, hold to place; or discard / erase on tap. */
export type Mode = 'play' | 'mark' | 'erase';
/** What a gesture on a cell does. */
export type Action = 'place' | 'note' | 'mark' | 'erase';

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
  /** Overlay the solution on the board (player pieces are kept, mistakes highlighted). */
  showSolution: boolean;
}

export function newGame(level: Level): GameState {
  return {
    level,
    placements: {},
    notes: new Map(),
    marks: new Set(),
    selected: level.puzzle.people[0]!.id,
    mode: 'play',
    accusation: null,
    message: null,
    showSolution: false,
  };
}

export function personAt(state: GameState, cell: CellIndex): PersonId | undefined {
  return Object.entries(state.placements).find(([, c]) => c === cell)?.[0];
}

function cloneNotes(notes: GameState['notes']): GameState['notes'] {
  return new Map([...notes].map(([cell, ids]) => [cell, new Set(ids)]));
}

/** What a quick tap does in the current mode. */
export const tapAction = (mode: Mode): Action => (mode === 'play' ? 'note' : mode);

/** Free cells sharing a row or column with a placed person: nobody else can be there. */
export function crossedCells(state: GameState): Set<CellIndex> {
  const n = state.level.puzzle.board.size;
  const placed = Object.values(state.placements) as CellIndex[];
  const rows = new Set(placed.map((c) => rowOf(c, n)));
  const cols = new Set(placed.map((c) => colOf(c, n)));
  const out = new Set<CellIndex>();
  for (let c = 0; c < n * n; c++)
    if ((rows.has(rowOf(c, n)) || cols.has(colOf(c, n))) && !placed.includes(c) && !isBlocked(state.level.puzzle.board, c)) out.add(c);
  return out;
}

/** Apply an action (default: a tap in the current mode) to a cell. Cells with blocking furniture ignore everything. */
export function clickCell(state: GameState, cell: CellIndex, mode: Action = tapAction(state.mode)): GameState {
  if (isBlocked(state.level.puzzle.board, cell)) return state;
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
      if (occupant || crossedCells(state).has(cell)) break;
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
  // Picking a person while discarding/erasing switches back to play.
  return { ...state, selected: id, mode: 'play' };
}

export function conflicts(state: GameState): Conflict[] {
  return findConflicts(state.level.puzzle.board, state.placements);
}

/** "el asesino" / "la asesina", agreeing with the murderer's gender. */
function murdererNoun(p: { gender: 'm' | 'f' }): string {
  return p.gender === 'f' ? 'la asesina' : 'el asesino';
}

export function check(state: GameState): GameState {
  const { puzzle, solution } = state.level;
  const missing = puzzle.people.filter((p) => state.placements[p.id] === undefined);
  let message: GameState['message'];
  if (missing.length) message = { ok: false, text: `Faltan por colocar: ${missing.map((p) => p.name).join(', ')}.` };
  else if (conflicts(state).length) message = { ok: false, text: 'Hay conflictos de fila o columna.' };
  else if (!samePositions(state.placements as Positions, solution.positions))
    message = { ok: false, text: 'La colocación no es correcta.' };
  else if (state.accusation === null) message = { ok: true, text: 'Colocación correcta. Ahora acusa al culpable.' };
  else if (state.accusation !== solution.murderer) message = { ok: false, text: 'Colocación correcta, pero has acusado a un inocente.' };
  else {
    const m = puzzle.people.find((p) => p.id === solution.murderer)!;
    message = { ok: true, text: `¡Caso resuelto! ${m.name} es ${murdererNoun(m)}.` };
  }
  return { ...state, message };
}

/** Player placements compared with the solution. */
export interface SolutionReview {
  correct: PersonId[];
  /** Placed, but on the wrong cell. */
  wrong: PersonId[];
  missing: PersonId[];
}

export function reviewPlacements(state: GameState): SolutionReview {
  const review: SolutionReview = { correct: [], wrong: [], missing: [] };
  for (const p of state.level.puzzle.people) {
    const placed = state.placements[p.id];
    if (placed === undefined) review.missing.push(p.id);
    else if (placed === state.level.solution.positions[p.id]) review.correct.push(p.id);
    else review.wrong.push(p.id);
  }
  return review;
}

export function toggleSolution(state: GameState): GameState {
  if (state.showSolution) return { ...state, showSolution: false, message: null };
  const { puzzle, solution } = state.level;
  const r = reviewPlacements(state);
  const murderer = puzzle.people.find((p) => p.id === solution.murderer)!;
  const parts = [`Bien colocadas: ${r.correct.length} de ${puzzle.people.length}.`];
  if (r.wrong.length) parts.push(`Mal colocadas (en rojo): ${r.wrong.length}.`);
  return {
    ...state,
    showSolution: true,
    message: { ok: r.wrong.length === 0 && r.missing.length === 0, text: `${murderer.name} era ${murdererNoun(murderer)}. ${parts.join(' ')}` },
  };
}
