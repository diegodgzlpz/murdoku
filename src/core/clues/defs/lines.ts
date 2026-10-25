import { colOf, rowOf } from '../../model/geometry';
import { unaryDef } from '../clueDef';
import type { InLineClue } from '../types';

const ORDINALS = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena'];

export const inLine = unaryDef<InLineClue>({
  kind: 'inLine',
  allows: (clue, board, cell) =>
    (clue.axis === 'row' ? rowOf(cell, board.size) : colOf(cell, board.size)) === clue.index,
  text: (clue, ctx) => {
    const ordinal = clue.index === ctx.board.size - 1 ? 'última' : ORDINALS[clue.index] ?? `${clue.index + 1}ª`;
    return `${ctx.person(clue.person).name} estaba en la ${ordinal} ${clue.axis === 'row' ? 'fila' : 'columna'}.`;
  },
  enumerateTrue: ({ board, suspects, solution }) =>
    suspects.flatMap((p): InLineClue[] => {
      const cell = solution.positions[p.id]!;
      return [
        { kind: 'inLine', person: p.id, axis: 'row', index: rowOf(cell, board.size) },
        { kind: 'inLine', person: p.id, axis: 'col', index: colOf(cell, board.size) },
      ];
    }),
});
