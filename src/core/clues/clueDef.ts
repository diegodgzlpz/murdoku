import type { Board, CellIndex, Person, PersonId, Positions, Solution } from '../model/types';
import type { Clue } from './types';

/**
 * View of the solver's partial state handed to clue pruners.
 * People are addressed by index (position in puzzle.people) for speed.
 */
export interface PruneContext {
  readonly board: Board;
  readonly people: Person[];
  readonly personCount: number;
  index(id: PersonId): number;
  has(person: number, cell: CellIndex): boolean;
  candidates(person: number): CellIndex[];
  /** Discard a candidate (no-op if already absent). */
  remove(person: number, cell: CellIndex): void;
  /** Declare the partial state contradictory. */
  fail(): void;
}

export interface TextContext {
  board: Board;
  person(id: PersonId): Person;
}

export interface EnumerateContext {
  board: Board;
  /** Only suspects: clues never mention the victim. */
  suspects: Person[];
  /** Everybody, victim included (for clues that count people). */
  people: Person[];
  solution: Solution;
}

export interface ClueDef<C extends Clue = Clue> {
  kind: C['kind'];
  /** True when truth depends only on one person's cell (pruning is then exact). */
  unary?: boolean;
  /** People mentioned by the clue. */
  persons(clue: C): PersonId[];
  /** Does the clue hold for a complete placement? */
  evaluate(clue: C, board: Board, positions: Positions, people: Person[]): boolean;
  /** Remove candidates that the clue rules out given the current partial state. Must be sound. */
  prune(clue: C, ctx: PruneContext): void;
  /** Spanish sentence. */
  text(clue: C, ctx: TextContext): string;
  /** Every clue of this kind that is true for the solution. */
  enumerateTrue(ctx: EnumerateContext): C[];
}

/** Spec for clues about a single person whose truth depends only on that person's cell. */
export interface UnarySpec<C extends Clue & { person: PersonId }> {
  kind: C['kind'];
  allows(clue: C, board: Board, cell: CellIndex): boolean;
  text(clue: C, ctx: TextContext): string;
  enumerateTrue(ctx: EnumerateContext): C[];
}

/** Allowed-cell masks are static per (board, clue): cache them. */
const maskCache = new WeakMap<Board, WeakMap<Clue, Uint8Array>>();

export function unaryDef<C extends Clue & { person: PersonId }>(spec: UnarySpec<C>): ClueDef<C> {
  const mask = (clue: C, board: Board): Uint8Array => {
    let perBoard = maskCache.get(board);
    if (!perBoard) {
      perBoard = new WeakMap();
      maskCache.set(board, perBoard);
    }
    let m = perBoard.get(clue);
    if (!m) {
      m = new Uint8Array(board.size * board.size);
      for (let c = 0; c < m.length; c++) m[c] = spec.allows(clue, board, c) ? 1 : 0;
      perBoard.set(clue, m);
    }
    return m;
  };
  return {
    kind: spec.kind,
    unary: true,
    persons: (clue) => [clue.person],
    evaluate: (clue, board, positions) => {
      const cell = positions[clue.person];
      return cell !== undefined && spec.allows(clue, board, cell);
    },
    prune: (clue, ctx) => {
      const m = mask(clue, ctx.board);
      const p = ctx.index(clue.person);
      for (const cell of ctx.candidates(p)) if (!m[cell]) ctx.remove(p, cell);
    },
    text: spec.text,
    enumerateTrue: spec.enumerateTrue,
  };
}
