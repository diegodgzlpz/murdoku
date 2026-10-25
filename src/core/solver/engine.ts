import type { PruneContext } from '../clues/clueDef';
import { pruneClue } from '../clues/registry';
import type { Clue } from '../clues/types';
import { indexBoard } from '../model/boardIndex';
import { colOf, rowOf } from '../model/geometry';
import type { Board, CellIndex, Person, PersonId } from '../model/types';

export type DeductionCause =
  | { rule: 'blocked' }
  | { rule: 'rowCol' }
  | { rule: 'murdererRoom' }
  | { rule: 'clue'; clueIndex: number };

export type Deduction =
  | { type: 'eliminate'; person: PersonId; cells: CellIndex[]; cause: DeductionCause }
  | { type: 'assign'; person: PersonId; cell: CellIndex; cause: DeductionCause | { rule: 'guess' } }
  | { type: 'guess'; person: PersonId; cell: CellIndex; depth: number }
  | { type: 'backtrack'; person: PersonId; cell: CellIndex; depth: number };

/** Immutable, precomputed description of what the engine solves. */
export interface Model {
  board: Board;
  people: Person[];
  clues: Clue[];
  size: number;
  cellCount: number;
  personCount: number;
  victim: number;
  personIndex: Map<PersonId, number>;
}

export function compileModel(board: Board, people: Person[], clues: Clue[]): Model {
  const victim = people.findIndex((p) => p.isVictim);
  if (victim < 0) throw new Error('Puzzle has no victim');
  if (people.length !== board.size) throw new Error('People count must equal board size');
  return {
    board,
    people,
    clues,
    size: board.size,
    cellCount: board.size * board.size,
    personCount: people.length,
    victim,
    personIndex: new Map(people.map((p, i) => [p.id, i])),
  };
}

/** Candidate domains: dom[p * cellCount + cell] = 1 when cell is still possible for person p. */
export class State {
  constructor(
    readonly dom: Uint8Array,
    readonly count: Int16Array,
  ) {}

  static initial(model: Model): State {
    const dom = new Uint8Array(model.personCount * model.cellCount).fill(1);
    const count = new Int16Array(model.personCount).fill(model.cellCount);
    return new State(dom, count);
  }

  clone(): State {
    return new State(this.dom.slice(), this.count.slice());
  }
}

/**
 * Runs all propagators to a fixpoint. Returns false on contradiction.
 * Every rule here must be sound: it may only remove candidates that cannot be part of any solution.
 */
export class Propagator implements PruneContext {
  readonly board: Board;
  readonly personCount: number;
  private state!: State;
  private changed = false;
  private failed = false;
  private cause: DeductionCause = { rule: 'blocked' };
  private pending = new Map<number, CellIndex[]>();

  constructor(
    readonly model: Model,
    private log: Deduction[] | null = null,
  ) {
    this.board = model.board;
    this.personCount = model.personCount;
  }

  // ---- PruneContext ----
  index(id: PersonId): number {
    const i = this.model.personIndex.get(id);
    if (i === undefined) throw new Error(`Unknown person ${id}`);
    return i;
  }
  has(p: number, cell: CellIndex): boolean {
    return this.state.dom[p * this.model.cellCount + cell] === 1;
  }
  candidates(p: number): CellIndex[] {
    const out: CellIndex[] = [];
    const base = p * this.model.cellCount;
    for (let c = 0; c < this.model.cellCount; c++) if (this.state.dom[base + c]) out.push(c);
    return out;
  }
  remove(p: number, cell: CellIndex): void {
    const i = p * this.model.cellCount + cell;
    if (!this.state.dom[i]) return;
    this.state.dom[i] = 0;
    this.state.count[p]!--;
    this.changed = true;
    if (this.state.count[p] === 0) this.failed = true;
    if (this.log) {
      const list = this.pending.get(p);
      if (list) list.push(cell);
      else this.pending.set(p, [cell]);
    }
  }
  fail(): void {
    this.failed = true;
  }

  // ---- driver ----
  /** Point the context at a state (for running a single pruner by hand, e.g. hints or tests). */
  attach(state: State): this {
    this.state = state;
    this.failed = false;
    return this;
  }

  /** Removes blocked cells. Call once on a fresh state. */
  applyStatic(state: State): boolean {
    this.state = state;
    this.failed = false;
    this.withCause({ rule: 'blocked' }, () => {
      const { blocked } = indexBoard(this.board);
      for (let c = 0; c < this.model.cellCount; c++)
        if (blocked[c]) for (let p = 0; p < this.personCount; p++) this.remove(p, c);
    });
    return !this.failed;
  }

  assign(state: State, p: number, cell: CellIndex): boolean {
    this.state = state;
    this.failed = false;
    const base = p * this.model.cellCount;
    for (let c = 0; c < this.model.cellCount; c++) {
      if (c !== cell && state.dom[base + c]) {
        state.dom[base + c] = 0;
        state.count[p]!--;
      }
    }
    if (!state.dom[base + cell]) this.failed = true;
    return !this.failed;
  }

  propagate(state: State): boolean {
    this.state = state;
    this.failed = false;
    do {
      this.changed = false;
      this.model.clues.forEach((clue, clueIndex) => {
        if (!this.failed) this.withCause({ rule: 'clue', clueIndex }, () => pruneClue(clue, this));
      });
      if (!this.failed) this.withCause({ rule: 'rowCol' }, () => this.rowCol());
      if (!this.failed) this.withCause({ rule: 'murdererRoom' }, () => this.murdererRoom());
    } while (this.changed && !this.failed);
    return !this.failed;
  }

  private withCause(cause: DeductionCause, fn: () => void): void {
    this.cause = cause;
    const before = this.log ? Array.from(this.state.count) : null;
    fn();
    if (!this.log || !before) return;
    for (const [p, cells] of this.pending) {
      const person = this.model.people[p]!.id;
      this.log.push({ type: 'eliminate', person, cells, cause });
      if (before[p]! > 1 && this.state.count[p] === 1)
        this.log.push({ type: 'assign', person, cell: this.candidates(p)[0]!, cause });
    }
    this.pending.clear();
  }

  /** One person per row and per column (N-rooks). */
  private rowCol(): void {
    const { size, personCount } = this.model;
    for (const axis of [rowOf, colOf]) {
      const linesOf: number[][] = [];
      const holders: number[][] = Array.from({ length: size }, () => []);
      for (let p = 0; p < personCount; p++) {
        const lines = new Set(this.candidates(p).map((c) => axis(c, size)));
        linesOf.push([...lines]);
        for (const l of lines) holders[l]!.push(p);
      }
      // Naked: a person confined to one line takes it from everybody else.
      linesOf.forEach((lines, p) => {
        if (lines.length !== 1) return;
        const line = lines[0]!;
        for (const q of holders[line]!) {
          if (q === p) continue;
          for (const c of this.candidates(q)) if (axis(c, size) === line) this.remove(q, c);
        }
      });
      // Hidden: a line with a single possible holder confines that holder to it.
      holders.forEach((ps, line) => {
        if (ps.length === 0) return this.fail();
        if (ps.length !== 1) return;
        const p = ps[0]!;
        for (const c of this.candidates(p)) if (axis(c, size) !== line) this.remove(p, c);
      });
      if (this.failed) return;
    }
  }

  /** The victim's room holds exactly one other person. */
  private murdererRoom(): void {
    const { victim, personCount } = this.model;
    const roomOf = this.board.roomOf;
    const roomCount = this.board.rooms.length;
    const certain: number[][] = Array.from({ length: roomCount }, () => []);
    const possible: number[][] = Array.from({ length: roomCount }, () => []);
    for (let p = 0; p < personCount; p++) {
      if (p === victim) continue;
      const rooms = new Set(this.candidates(p).map((c) => roomOf[c]!));
      for (const r of rooms) possible[r]!.push(p);
      if (rooms.size === 1) certain[[...rooms][0]!]!.push(p);
    }
    const feasible = (r: number) => certain[r]!.length <= 1 && possible[r]!.length >= 1;
    for (const c of this.candidates(victim)) if (!feasible(roomOf[c]!)) this.remove(victim, c);

    const vRooms = new Set(this.candidates(victim).map((c) => roomOf[c]!));
    if (vRooms.size !== 1) return;
    const room = [...vRooms][0]!;
    if (certain[room]!.length === 1) {
      const murderer = certain[room]![0]!;
      for (const p of possible[room]!) {
        if (p === murderer) continue;
        for (const c of this.candidates(p)) if (roomOf[c] === room) this.remove(p, c);
      }
    }
    if (possible[room]!.length === 1) {
      const p = possible[room]![0]!;
      for (const c of this.candidates(p)) if (roomOf[c] !== room) this.remove(p, c);
    }
  }
}
