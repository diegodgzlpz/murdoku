import { cluePersons, evaluateClue } from '../clues/registry';
import { isBlocked } from '../model/boardIndex';
import { murdererOf, placementViolations, samePositions } from '../model/rules';
import { VICTIM_ID, type Level } from '../model/types';
import { countSolutions, solve } from '../solver/solver';
import { isContiguous } from './partition';

/**
 * Checks everything a delivered level must satisfy. Empty array = valid.
 * Runs on every generated level and can be run on loaded JSON.
 */
export function checkLevelInvariants(level: Level): string[] {
  const { puzzle, solution } = level;
  const { board, people, clues } = puzzle;
  const errors: string[] = [];
  const n = board.size;

  if (people.length !== n) errors.push(`expected ${n} people, got ${people.length}`);
  if (people.filter((p) => p.isVictim).length !== 1 || !people.some((p) => p.id === VICTIM_ID))
    errors.push('exactly one victim with id V required');
  board.rooms.forEach((room, i) => {
    if (room.id !== i) errors.push(`room index ${i} has id ${room.id}`);
    if (!isContiguous(room.cells, n)) errors.push(`room ${room.name} is not contiguous`);
    for (const c of room.cells) if (board.roomOf[c] !== room.id) errors.push(`room ${room.name} cell ${c} mismatch`);
  });
  if (new Set(board.rooms.map((r) => r.name)).size !== board.rooms.length) errors.push('room names not unique');

  for (const p of people) {
    const cell = solution.positions[p.id];
    if (cell === undefined) errors.push(`${p.id} missing from solution`);
    else if (isBlocked(board, cell)) errors.push(`${p.id} on a blocked cell`);
  }
  errors.push(...placementViolations(puzzle, solution.positions).map((e) => `solution: ${e}`));
  clues.forEach((c, i) => {
    if (!evaluateClue(c, board, solution.positions, people)) errors.push(`clue #${i} false in solution`);
    if (cluePersons(c).includes(VICTIM_ID)) errors.push(`clue #${i} mentions the victim`);
  });
  // A row clue plus a column clue would just hand out the person's cell.
  const lineClues = clues.filter((c) => c.kind === 'inLine').map((c) => c.person);
  for (const id of new Set(lineClues))
    if (lineClues.filter((x) => x === id).length > 1) errors.push(`${id} has both a row and a column clue`);

  const murderer = murdererOf(board, solution.positions);
  if (murderer === null || murderer !== solution.murderer) errors.push('murderer mismatch or not unique');

  if (errors.length) return errors;
  const count = countSolutions(puzzle, 2);
  if (count !== 1) errors.push(`expected exactly 1 solution, found ${count === 2 ? '2+' : count}`);
  const solved = solve(puzzle);
  if (!solved || !samePositions(solved.positions, solution.positions)) errors.push('solver solution differs');
  return errors;
}
