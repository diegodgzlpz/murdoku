import { FURNITURE, indexBoard, neighborAt, puzzleClueGroups, SIDES, type Person, type Side } from '../core/index';
import { conflicts, crossedCells, type GameState, type Mode } from './state';
import { assignAvatars, avatarSvg } from './avatars';
import { furnitureIcon, imgAttrs, magnifierIcon, markIcon, personIcon, windowIcon } from './icons/registry';
import { noteColor, personColor, roomTint } from './theme';

const SIDE_CSS: Record<Side, string> = { N: 'Top', S: 'Bottom', E: 'Right', W: 'Left' };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function tokenHtml(p: Pick<Person, 'id' | 'isVictim'>, extraClass = ''): string {
  const { fill, ink } = personColor(p.id);
  return `<span class="token${p.isVictim ? ' victim' : ''} ${extraClass}" style="--fill:${fill};--ink:${ink}">${p.id}</span>`;
}

/** Portrait with the pawn letter as a badge; the shirt wears the pawn colour. */
function avatarHtml(p: Person, variant: number, size: 'big' | 'small'): string {
  const { fill } = personColor(p.id);
  const shirt = p.isVictim ? '#4a4a4a' : fill;
  return `<span class="avatar ${size}${p.isVictim ? ' victim' : ''}" style="--fill:${fill}">${avatarSvg(p.gender, variant, shirt)}${tokenHtml(p, 'badge')}</span>`;
}

/** Board piece: the person icon (suspects tinted with their pawn colour) with the letter on top via CSS. */
function pieceHtml(p: Person, extraClass = ''): string {
  const { fill } = personColor(p.id);
  const icon = personIcon(p.isVictim);
  return `<span class="piece${p.isVictim ? ' victim' : ''}${extraClass}" style="--fill:${fill};--icon:url('${icon.src64}')"><img ${imgAttrs(icon, 'piece-img')}><b>${p.id}</b></span>`;
}

export function renderBoard(el: HTMLElement, state: GameState): void {
  const { board, people } = state.level.puzzle;
  const n = board.size;
  const idx = indexBoard(board);
  const bad = new Set<number>();
  for (const c of conflicts(state)) for (const id of c.persons) bad.add(state.placements[id]!);
  const crossed = crossedCells(state);
  const occupant = new Map(Object.entries(state.placements).map(([id, cell]) => [cell!, id]));
  const solutionAt = new Map(Object.entries(state.level.solution.positions).map(([id, cell]) => [cell, id]));
  // Label each room in its top-left-most cell without furniture (else its first cell), so icons stay visible.
  const labelCell = new Map(
    board.rooms.map((r) => {
      const cells = [...r.cells].sort((x, y) => x - y);
      return [cells.find((c) => !idx.furnitureAt[c]) ?? cells[0]!, r.name];
    }),
  );
  const order = new Map(people.map((p, i) => [p.id, i]));

  // --cell is derived from --n on :root, so the board size must be set there.
  document.documentElement.style.setProperty('--n', String(n));
  el.dataset.mode = state.mode;
  // Colour of the hold-to-place ring.
  el.style.setProperty('--sel', personColor(state.selected).fill);
  el.replaceChildren();
  for (let cell = 0; cell < n * n; cell++) {
    const room = board.roomOf[cell]!;
    const div = document.createElement('div');
    div.className = `cell floor-${room % 4}`;
    div.dataset.cell = String(cell);
    div.style.backgroundColor = roomTint(room);
    let html = '';
    for (const side of SIDES) {
      const nb = neighborAt(cell, side, n);
      const prop = `border${SIDE_CSS[side]}` as 'borderTop';
      div.style[prop] = nb === null || board.roomOf[nb] !== room ? 'var(--wall-w) solid var(--wall)' : '1px solid var(--grid)';
      if (idx.windowSides[cell]!.includes(side)) html += `<img ${imgAttrs(windowIcon(), `window-icon w-${side}`)} title="Ventana">`;
    }
    const label = labelCell.get(cell);
    if (label) html += `<span class="room">${esc(label)}</span>`;
    const f = idx.furnitureAt[cell];
    if (f) {
      const icon = furnitureIcon(f.type, cell);
      const title = esc(FURNITURE[f.type].withArticle);
      html += icon
        ? `<img ${imgAttrs(icon, 'furn furn-img')} title="${title}">`
        : `<span class="furn" title="${title}">${FURNITURE[f.type].glyph}</span>`;
      div.classList.add(f.occupiable ? 'seat' : 'blocked');
    }
    const who = occupant.get(cell);
    const truth = state.showSolution ? solutionAt.get(cell) : undefined;
    if (who) {
      const verdict = !state.showSolution ? '' : truth === who ? ' right' : ' wrong';
      html += pieceHtml(people.find((x) => x.id === who)!, verdict);
    }
    // Solution overlay: a ghost piece wherever the right person is not already placed.
    if (truth && truth !== who) html += pieceHtml(people.find((x) => x.id === truth)!, who ? ' ghost corner' : ' ghost');
    else if (!who && state.marks.has(cell)) html += `<img ${imgAttrs(markIcon(), 'mark')}>`;
    // Automatic cross: the row or column already has someone (notes stay underneath for when they leave).
    else if (crossed.has(cell)) html += `<img ${imgAttrs(markIcon(), 'mark auto')}>`;
    else if (!who) {
      const notes = state.notes.get(cell);
      if (notes?.size) {
        const ids = [...notes].sort((a, b) => order.get(a)! - order.get(b)!);
        html += `<span class="notes">${ids.map((id) => `<b style="color:${noteColor(id)}">${id}</b>`).join('')}</span>`;
      }
    }
    div.innerHTML = html;
    if (bad.has(cell)) div.classList.add('conflict');
    if (crossed.has(cell)) div.classList.add('crossed');
    el.append(div);
  }
}

/** Character cards (portrait + speech bubble), general clues as magnifier bubbles, victim last. */
export function renderClues(el: HTMLElement, state: GameState): void {
  const placed = state.placements;
  const avatars = assignAvatars(state.level.puzzle.people);
  el.innerHTML = puzzleClueGroups(state.level.puzzle)
    .map((g) => {
      const lines = g.lines.length
        ? g.lines.map((l) => `<p${l.clueIndex === null ? '' : ` data-clue="${l.clueIndex}"`}>${esc(l.text)}</p>`).join('')
        : `<p class="empty">Sin pistas propias.</p>`;
      if (!g.person) return `<article class="card general"><img ${imgAttrs(magnifierIcon(), 'lens')}><div class="bubble">${lines}</div></article>`;
      const p = g.person;
      const done = placed[p.id] !== undefined ? '<span class="placed" title="Colocado">✓</span>' : '';
      return `<article class="card${p.isVictim ? ' victim' : ''}" data-person="${p.id}">
        <div class="portrait">${avatarHtml(p, avatars.get(p.id)!, 'big')}<span class="name">${esc(p.name)}</span>${done}</div>
        <div class="bubble">${lines}</div>
      </article>`;
    })
    .join('');
}

const MODES: Array<{ mode: Mode; label: string; key: string }> = [
  { mode: 'play', label: 'Jugar', key: 'P' },
  { mode: 'mark', label: 'Descartar', key: 'X' },
  { mode: 'erase', label: 'Borrar', key: '⌫' },
];

export function renderTools(el: HTMLElement, state: GameState): void {
  const people = state.level.puzzle.people;
  const avatars = assignAvatars(people);
  const pawns = people
    .map((p) => {
      const active = state.selected === p.id && state.mode === 'play';
      const placed = state.placements[p.id] !== undefined;
      return `<button class="pawn${active ? ' active' : ''}${placed ? ' placed' : ''}" data-person="${p.id}" title="${esc(p.name)} (tecla ${p.id})">${avatarHtml(p, avatars.get(p.id)!, 'small')}<span>${esc(p.name)}</span></button>`;
    })
    .join('');
  const modes = MODES.map(
    (m) =>
      `<button class="mode${state.mode === m.mode ? ' active' : ''}" data-mode="${m.mode}" title="Tecla ${m.key}">${m.label}<kbd>${m.key}</kbd></button>`,
  ).join('');
  el.innerHTML = `<div class="pawns">${pawns}</div><div class="modes" role="group" aria-label="Modo">${modes}</div>`;
}

export function renderAccuse(el: HTMLElement, state: GameState): void {
  const avatars = assignAvatars(state.level.puzzle.people);
  el.innerHTML = state.level.puzzle.people
    .filter((p) => !p.isVictim)
    .map(
      (p) =>
        `<button class="suspect${state.accusation === p.id ? ' active' : ''}" data-accuse="${p.id}" title="${esc(p.name)}">${avatarHtml(p, avatars.get(p.id)!, 'small')}<span>${esc(p.name)}</span></button>`,
    )
    .join('');
}
