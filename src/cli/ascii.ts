import { FURNITURE, indexBoard, neighborAt, puzzleClueTexts, type Level, type Side } from '../core/index';

const ROOM_LABELS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * ASCII rendering for debugging.
 *  - '#' / '|' thick walls between rooms, blanks inside a room, '~' / '$' windows on the outer edge.
 *  - Cell: [furniture letter][person or '.']  (lowercase furniture = occupiable, uppercase = blocked).
 */
export function renderLevel(level: Level, showSolution: boolean): string {
  const { board, people } = level.puzzle;
  const n = board.size;
  const idx = indexBoard(board);
  const personAt = new Map<number, string>();
  if (showSolution) for (const [id, cell] of Object.entries(level.solution.positions)) personAt.set(cell, id);

  const wall = (cell: number, side: Side): 'window' | 'thick' | 'thin' => {
    if (idx.windowSides[cell]!.includes(side)) return 'window';
    const nb = neighborAt(cell, side, n);
    return nb === null || board.roomOf[nb] !== board.roomOf[cell] ? 'thick' : 'thin';
  };

  const lines: string[] = [];
  for (let r = 0; r <= n; r++) {
    // Horizontal border above row r.
    let h = '';
    for (let c = 0; c < n; c++) {
      const below = r < n ? r * n + c : null;
      const above = r > 0 ? (r - 1) * n + c : null;
      const kind = below !== null ? wall(below, 'N') : wall(above!, 'S');
      h += '+' + (kind === 'window' ? '~~~' : kind === 'thick' ? '###' : '   ');
    }
    lines.push(h + '+');
    if (r === n) break;
    let row = '';
    for (let c = 0; c < n; c++) {
      const cell = r * n + c;
      const w = wall(cell, 'W');
      row += w === 'window' ? '$' : w === 'thick' ? '|' : ' ';
      const f = idx.furnitureAt[cell];
      row += (f ? FURNITURE[f.type].letter : ' ') + (personAt.get(cell) ?? '.') + ' ';
    }
    const e = wall(r * n + n - 1, 'E');
    lines.push(row + (e === 'window' ? '$' : '|'));
  }

  const roomMap: string[] = [];
  for (let r = 0; r < n; r++)
    roomMap.push(Array.from({ length: n }, (_, c) => ROOM_LABELS[board.roomOf[r * n + c]!]).join(' '));

  const out: string[] = [];
  const p = level.params;
  out.push(`Murdoku ${n}x${n} | seed=${p.seed} | escenario=${p.scenarioId} | dificultad=${p.difficulty}`);
  out.push(`Generado en ${level.stats.ms} ms (${level.stats.attempts} intentos), conjeturas del solver: ${level.stats.guesses}`);
  out.push('');
  out.push(...lines);
  out.push('');
  out.push('Habitaciones:');
  roomMap.forEach((line, i) => {
    const room = board.rooms[i];
    out.push(`  ${line}    ${room ? `${ROOM_LABELS[room.id]} = ${room.name}` : ''}`);
  });
  for (let i = n; i < board.rooms.length; i++) out.push(`  ${' '.repeat(2 * n - 1)}    ${ROOM_LABELS[i]} = ${board.rooms[i]!.name}`);
  const used = [...new Set(board.furniture.map((f) => f.type))];
  out.push('');
  out.push('Muebles: ' + used.map((t) => `${FURNITURE[t].letter}=${FURNITURE[t].withArticle.split(' ')[1]}`).join(', '));
  out.push('Personas: ' + people.map((x) => `${x.id}=${x.name}`).join(', '));
  out.push('');
  out.push('Pistas:');
  puzzleClueTexts(level.puzzle).forEach((t, i) => out.push(`  ${i}. ${t}`));
  if (showSolution) {
    const m = people.find((x) => x.id === level.solution.murderer)!;
    out.push('');
    out.push(`Solución: asesino = ${m.id} (${m.name})`);
  }
  return out.join('\n');
}
