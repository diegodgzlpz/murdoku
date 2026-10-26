import {
  clueText,
  colOf,
  findConflicts,
  isBlocked,
  rowOf,
  samePositions,
  solveWithLog,
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
  /** Board snapshots before each change, newest last (for undo). */
  history: BoardSnapshot[];
  /** Current hint; any board change clears it. */
  hint: Hint | null;
}

export type BoardSnapshot = Pick<GameState, 'placements' | 'notes' | 'marks'>;

export interface Hint {
  person: PersonId;
  /** Where the person belongs. */
  cell: CellIndex;
  /** Clue that pins the person down, when there is one. */
  clueIndex: number | null;
  /** Second request for the same hint: the cell is shown. */
  revealed: boolean;
}

const HISTORY_LIMIT = 200;

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
    history: [],
    hint: null,
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
  const next = { ...state, placements, marks, notes };
  if (sameBoard(state, next)) return state;
  // After placing someone, move on to the next person still off the board.
  const selected = mode === 'place' && placements[id] !== undefined ? nextUnplaced(state, placements, id) : state.selected;
  const history = [...state.history, snapshot(state)].slice(-HISTORY_LIMIT);
  return { ...next, selected, history, message: null, hint: null };
}

const snapshot = (s: BoardSnapshot): BoardSnapshot => ({ placements: s.placements, notes: s.notes, marks: s.marks });

function sameBoard(a: BoardSnapshot, b: BoardSnapshot): boolean {
  const pa = Object.entries(a.placements);
  if (pa.length !== Object.keys(b.placements).length || pa.some(([id, c]) => b.placements[id] !== c)) return false;
  if (a.marks.size !== b.marks.size || [...a.marks].some((c) => !b.marks.has(c))) return false;
  if (a.notes.size !== b.notes.size) return false;
  for (const [cell, ids] of a.notes) {
    const other = b.notes.get(cell);
    if (!other || other.size !== ids.size || [...ids].some((id) => !other.has(id))) return false;
  }
  return true;
}

function nextUnplaced(state: GameState, placements: Partial<Positions>, from: PersonId): PersonId {
  const people = state.level.puzzle.people;
  const start = people.findIndex((p) => p.id === from);
  for (let k = 1; k < people.length; k++) {
    const p = people[(start + k) % people.length]!;
    if (placements[p.id] === undefined) return p.id;
  }
  return from;
}

export function undo(state: GameState): GameState {
  const prev = state.history.at(-1);
  if (!prev) return { ...state, message: { ok: false, text: 'No hay nada que deshacer.' } };
  return { ...state, ...prev, history: state.history.slice(0, -1), message: null, hint: null };
}

/**
 * Next logical step from the player's position: a misplaced person first; otherwise the first
 * person the deduction chain pins down who is not placed yet. Asking again reveals the cell.
 */
export function hint(state: GameState): GameState {
  const { puzzle, solution } = state.level;
  const name = (id: PersonId) => puzzle.people.find((p) => p.id === id)!.name;
  if (state.hint && !state.hint.revealed) {
    const h = { ...state.hint, revealed: true };
    return { ...state, hint: h, selected: h.person, mode: 'play', message: { ok: true, text: `${name(h.person)} va en la casilla marcada.` } };
  }
  const wrong = puzzle.people.find((p) => state.placements[p.id] !== undefined && state.placements[p.id] !== solution.positions[p.id]);
  if (wrong) {
    const h: Hint = { person: wrong.id, cell: solution.positions[wrong.id]!, clueIndex: null, revealed: false };
    return { ...state, hint: h, selected: h.person, mode: 'play', message: { ok: false, text: `${wrong.name} no está en su sitio.` } };
  }
  for (const d of solveWithLog(puzzle).log ?? []) {
    if (d.type === 'guess') break; // past this point the log explores branches that may be wrong
    if (d.type !== 'assign' || d.cause.rule === 'guess' || state.placements[d.person] === d.cell) continue;
    const clueIndex = d.cause.rule === 'clue' ? d.cause.clueIndex : null;
    let text = `${name(d.person)} solo puede estar en una casilla`;
    if (clueIndex !== null) text += `. Fíjate en: «${clueText(puzzle.clues[clueIndex]!, puzzle.board, puzzle.people).replace(/\.$/, '')}»`;
    else if (d.cause.rule === 'rowCol') text += ': descarta por filas y columnas';
    else if (d.cause.rule === 'murdererRoom') text += ': piensa en quién estaba a solas con la víctima';
    const h: Hint = { person: d.person, cell: d.cell, clueIndex, revealed: false };
    return { ...state, hint: h, selected: h.person, mode: 'play', message: { ok: true, text: `${text}. Pide otra pista para ver la casilla.` } };
  }
  const left = puzzle.people.find((p) => state.placements[p.id] === undefined);
  if (left) {
    const h: Hint = { person: left.id, cell: solution.positions[left.id]!, clueIndex: null, revealed: false };
    const text = `Toca probar: con lo que hay no se deduce nadie más. Pide otra pista para ver dónde va ${left.name}.`;
    return { ...state, hint: h, selected: h.person, mode: 'play', message: { ok: true, text } };
  }
  return { ...state, message: { ok: true, text: 'Ya están todos en su sitio. Ahora acusa al culpable.' } };
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
