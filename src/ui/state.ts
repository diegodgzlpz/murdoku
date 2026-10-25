import {
  findConflicts,
  samePositions,
  type CellIndex,
  type Conflict,
  type Level,
  type PersonId,
  type Positions,
} from '../core/index';

/** Pure UI state (no DOM). Tool = person to place, or the mark/erase tools. */
export type Tool = { kind: 'person'; id: PersonId } | { kind: 'mark' } | { kind: 'erase' };

export interface GameState {
  level: Level;
  placements: Partial<Positions>;
  marks: Set<CellIndex>;
  tool: Tool;
  accusation: PersonId | null;
  message: { text: string; ok: boolean } | null;
}

export function newGame(level: Level): GameState {
  const first = level.puzzle.people[0]!.id;
  return { level, placements: {}, marks: new Set(), tool: { kind: 'person', id: first }, accusation: null, message: null };
}

function personAt(state: GameState, cell: CellIndex): PersonId | undefined {
  return Object.entries(state.placements).find(([, c]) => c === cell)?.[0];
}

export function clickCell(state: GameState, cell: CellIndex): GameState {
  const placements = { ...state.placements };
  const marks = new Set(state.marks);
  const occupant = personAt(state, cell);
  switch (state.tool.kind) {
    case 'person': {
      const id = state.tool.id;
      if (occupant === id) delete placements[id]; // click again to remove
      else {
        if (occupant) delete placements[occupant];
        placements[id] = cell;
        marks.delete(cell);
      }
      break;
    }
    case 'mark':
      if (!occupant) marks.has(cell) ? marks.delete(cell) : marks.add(cell);
      break;
    case 'erase':
      if (occupant) delete placements[occupant];
      marks.delete(cell);
      break;
  }
  return { ...state, placements, marks, message: null };
}

export function toggleMark(state: GameState, cell: CellIndex): GameState {
  if (personAt(state, cell)) return state;
  const marks = new Set(state.marks);
  marks.has(cell) ? marks.delete(cell) : marks.add(cell);
  return { ...state, marks };
}

export function conflicts(state: GameState): Conflict[] {
  return findConflicts(state.level.puzzle.board, state.placements);
}

export function check(state: GameState): GameState {
  const { puzzle, solution } = state.level;
  const missing = puzzle.people.filter((p) => state.placements[p.id] === undefined);
  let message: GameState['message'];
  if (missing.length) message = { ok: false, text: `Faltan por colocar: ${missing.map((p) => p.id).join(', ')}.` };
  else if (conflicts(state).length) message = { ok: false, text: 'Hay conflictos de fila o columna.' };
  else if (!samePositions(state.placements as Positions, solution.positions))
    message = { ok: false, text: 'La colocación no es correcta.' };
  else if (state.accusation === null) message = { ok: true, text: 'Colocación correcta. Ahora acusa al asesino.' };
  else if (state.accusation !== solution.murderer) message = { ok: false, text: 'Colocación correcta, pero has acusado a un inocente.' };
  else {
    const m = puzzle.people.find((p) => p.id === solution.murderer)!;
    message = { ok: true, text: `¡Resuelto! ${m.name} es el asesino.` };
  }
  return { ...state, message };
}
