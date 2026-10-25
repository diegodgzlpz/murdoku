import { FURNITURE, indexBoard, neighborAt, puzzleClueTexts, SIDES, type Side } from '../core/index';
import { conflicts, type GameState } from './state';

const SIDE_CSS: Record<Side, string> = { N: 'Top', S: 'Bottom', E: 'Right', W: 'Left' };

export function renderBoard(el: HTMLElement, state: GameState): void {
  const { board, people } = state.level.puzzle;
  const n = board.size;
  const idx = indexBoard(board);
  const bad = new Set<number>();
  const badCells = new Set<number>();
  for (const c of conflicts(state)) {
    for (const id of c.persons) bad.add(state.placements[id]!);
    if (c.kind === 'blocked') badCells.add(c.at);
  }
  const occupant = new Map(Object.entries(state.placements).map(([id, cell]) => [cell!, id]));
  // Label each room in its first (top-left-most) cell.
  const labelCell = new Map(board.rooms.map((r) => [Math.min(...r.cells), r.name]));

  el.style.gridTemplateColumns = `repeat(${n}, 64px)`;
  el.replaceChildren();
  for (let cell = 0; cell < n * n; cell++) {
    const div = document.createElement('div');
    div.className = 'cell';
    div.dataset.cell = String(cell);
    for (const side of SIDES) {
      const nb = neighborAt(cell, side, n);
      const window = idx.windowSides[cell]!.includes(side);
      const thick = nb === null || board.roomOf[nb] !== board.roomOf[cell];
      div.style[`border${SIDE_CSS[side]}` as 'borderTop'] = window
        ? '5px solid #29f'
        : thick
          ? '3px solid #000'
          : '1px dotted #bbb';
    }
    const label = labelCell.get(cell);
    if (label) div.insertAdjacentHTML('beforeend', `<span class="room">${label}</span>`);
    const f = idx.furnitureAt[cell];
    if (f) {
      div.insertAdjacentHTML('beforeend', `<span class="furn" title="${FURNITURE[f.type].withArticle}">${FURNITURE[f.type].glyph}</span>`);
      if (!f.occupiable) div.classList.add('blocked');
    }
    const who = occupant.get(cell);
    if (who) {
      const p = people.find((x) => x.id === who)!;
      div.insertAdjacentHTML('beforeend', `<span class="person${p.isVictim ? ' victim' : ''}">${who}</span>`);
    } else if (state.marks.has(cell)) div.insertAdjacentHTML('beforeend', `<span class="mark">✗</span>`);
    if (bad.has(cell) || badCells.has(cell)) div.classList.add('conflict');
    el.append(div);
  }
}

export function renderClues(el: HTMLElement, state: GameState): void {
  el.replaceChildren(
    ...puzzleClueTexts(state.level.puzzle).map((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      return li;
    }),
  );
}

export function renderTools(el: HTMLElement, state: GameState): void {
  const { people } = state.level.puzzle;
  const btn = (label: string, active: boolean, data: string, title = '') =>
    `<button data-tool="${data}" class="${active ? 'active' : ''}" title="${title}">${label}</button>`;
  const t = state.tool;
  el.innerHTML =
    people
      .map((p) => {
        const placed = state.placements[p.id] !== undefined ? ' ✓' : '';
        return btn(`${p.id}${placed}`, t.kind === 'person' && t.id === p.id, `person:${p.id}`, p.name);
      })
      .join('') +
    btn('✗ descartar', t.kind === 'mark', 'mark') +
    btn('borrar', t.kind === 'erase', 'erase');
}

export function renderAccuse(select: HTMLSelectElement, state: GameState): void {
  const suspects = state.level.puzzle.people.filter((p) => !p.isVictim);
  select.innerHTML =
    `<option value="">— elige —</option>` +
    suspects
      .map((p) => `<option value="${p.id}" ${state.accusation === p.id ? 'selected' : ''}>${p.id} · ${p.name}</option>`)
      .join('');
}
