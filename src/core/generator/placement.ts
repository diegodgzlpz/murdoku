import { indexBoard } from '../model/boardIndex';
import { cellIndex } from '../model/geometry';
import { VICTIM_ID, type Board, type CellIndex, type Person, type Solution } from '../model/types';
import type { Rng } from '../rng/rng';

/** Random permutation (one cell per row/col) avoiding blocked cells, via randomized backtracking. */
function randomRookPlacement(rng: Rng, board: Board): CellIndex[] | null {
  const n = board.size;
  const { blocked } = indexBoard(board);
  const usedCols = new Array<boolean>(n).fill(false);
  const out: CellIndex[] = [];
  let budget = 2000;
  const place = (row: number): boolean => {
    if (row === n) return true;
    if (--budget < 0) return false;
    for (const col of rng.shuffle([...Array(n).keys()])) {
      const cell = cellIndex(row, col, n);
      if (usedCols[col] || blocked[cell]) continue;
      usedCols[col] = true;
      out.push(cell);
      if (place(row + 1)) return true;
      out.pop();
      usedCols[col] = false;
    }
    return false;
  };
  return place(0) ? out : null;
}

/**
 * Solution placement: valid permutation where the victim's room holds exactly one more person.
 * Returns null after `tries` failed attempts (caller regenerates the board).
 */
export function generateSolution(rng: Rng, board: Board, people: Person[], tries = 40): Solution | null {
  const suspects = people.filter((p) => !p.isVictim).map((p) => p.id);
  for (let t = 0; t < tries; t++) {
    const cells = randomRookPlacement(rng, board);
    if (!cells) continue;
    const byRoom = new Map<number, CellIndex[]>();
    for (const c of cells) {
      const r = board.roomOf[c]!;
      byRoom.set(r, [...(byRoom.get(r) ?? []), c]);
    }
    const pairRooms = [...byRoom.values()].filter((cs) => cs.length === 2);
    if (!pairRooms.length) continue;
    const pair = rng.shuffle(rng.pick(pairRooms));
    const [victimCell, murdererCell] = pair as [CellIndex, CellIndex];
    const rest = rng.shuffle(cells.filter((c) => c !== victimCell && c !== murdererCell));
    const order = rng.shuffle(suspects);
    const murderer = order[0]!;
    const positions: Solution['positions'] = { [VICTIM_ID]: victimCell, [murderer]: murdererCell };
    order.slice(1).forEach((id, i) => (positions[id] = rest[i]!));
    return { positions, murderer };
  }
  return null;
}
