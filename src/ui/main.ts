import './styles.css';
import {
  checkLevelInvariants,
  clueFocusCells,
  DIFFICULTIES,
  generateLevel,
  getScenario,
  levelFromJson,
  levelToJson,
  MAX_SIZE,
  MIN_SIZE,
  randomSeed,
  SCENARIOS,
  type Difficulty,
  type GenerationParams,
} from '../core/index';
import { renderAccuse, renderBoard, renderClues, renderTools } from './render';
import { check, clickCell, hint, newGame, selectPerson, toggleSolution, undo, type GameState, type Mode } from './state';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const boardEl = $<HTMLDivElement>('board');
const cluesEl = $<HTMLDivElement>('clues');
const toolsEl = $<HTMLDivElement>('tools');
const accuseEl = $<HTMLDivElement>('accuse');
const msgEl = $<HTMLParagraphElement>('message');
const infoEl = $<HTMLParagraphElement>('case-info');
const sizeEl = $<HTMLSelectElement>('size');
const scenarioEl = $<HTMLSelectElement>('scenario');
const difficultyEl = $<HTMLSelectElement>('difficulty');
const seedEl = $<HTMLInputElement>('seed');
const jsonEl = $<HTMLTextAreaElement>('json');

const DIFF_NAMES: Record<Difficulty, string> = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
sizeEl.innerHTML = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i)
  .map((n) => `<option value="${n}" ${n === 7 ? 'selected' : ''}>${n}×${n}</option>`)
  .join('');
scenarioEl.innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
difficultyEl.innerHTML = DIFFICULTIES.map(
  (d) => `<option value="${d}" ${d === 'medium' ? 'selected' : ''}>${DIFF_NAMES[d]}</option>`,
).join('');

let state: GameState | null = null;

function setMessage(text: string, kind: 'ok' | 'err' | '' = ''): void {
  msgEl.textContent = text;
  msgEl.className = kind;
}

function render(): void {
  if (!state) return;
  renderBoard(boardEl, state);
  renderClues(cluesEl, state);
  renderTools(toolsEl, state);
  renderAccuse(accuseEl, state);
  applyFocus();
  const solutionBtn = $<HTMLButtonElement>('solution');
  solutionBtn.textContent = state.showSolution ? 'Ocultar solución' : 'Ver solución';
  solutionBtn.setAttribute('aria-pressed', String(state.showSolution));
  setMessage(state.message?.text ?? '', state.message ? (state.message.ok ? 'ok' : 'err') : '');
  const p = state.level.params;
  let scenario = p.scenarioId;
  try {
    scenario = getScenario(p.scenarioId).name;
  } catch {
    /* unknown scenario in imported JSON: show its id */
  }
  infoEl.textContent = `Caso «${p.seed}» · ${scenario} · ${p.size}×${p.size} · ${DIFF_NAMES[p.difficulty] ?? p.difficulty}`;
}

function update(next: GameState): void {
  if (next.level !== state?.level) pinnedClue = null;
  state = next;
  render();
}

function readParams(seed: string): GenerationParams {
  return { size: Number(sizeEl.value), seed, scenarioId: scenarioEl.value, difficulty: difficultyEl.value as Difficulty };
}

function shareUrl(params: GenerationParams): string {
  const q = new URLSearchParams({ ...params, size: String(params.size) });
  return `${location.origin}${location.pathname}#${q}`;
}

function load(params: GenerationParams): void {
  setMessage('Preparando el caso…');
  // Let the browser paint the message before the (synchronous) generation.
  setTimeout(() => {
    try {
      const level = generateLevel(params);
      seedEl.value = params.seed;
      history.replaceState(null, '', shareUrl(params));
      update(newGame(level));
    } catch (e) {
      setMessage(`Error al generar: ${(e as Error).message}`, 'err');
    }
  }, 10);
}

// Board gestures: a quick tap applies the current tool (in play mode, a pencil note);
// holding the press places the selected person. Blocking furniture ignores everything.
const HOLD_MS = 450;
const cellEl = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.cell:not(.blocked)');
let press: { cell: number; x: number; y: number; el: HTMLElement; timer: number } | null = null;
let lastPointer = 'mouse';

function cancelPress(): void {
  if (!press) return;
  clearTimeout(press.timer);
  press.el.classList.remove('pressing');
  press = null;
}

boardEl.addEventListener('pointerdown', (e) => {
  lastPointer = e.pointerType;
  const el = cellEl(e);
  if (!state || !el || e.button !== 0) return;
  const cell = Number(el.dataset.cell);
  if (e.shiftKey) return update(clickCell(state, cell, 'place'));
  if (state.mode !== 'play') return update(clickCell(state, cell));
  el.classList.add('pressing');
  const timer = window.setTimeout(() => {
    press = null;
    navigator.vibrate?.(15);
    if (state) update(clickCell(state, cell, 'place'));
  }, HOLD_MS);
  press = { cell, x: e.clientX, y: e.clientY, el, timer };
});
boardEl.addEventListener('pointerup', () => {
  if (!press || !state) return;
  const { cell } = press;
  cancelPress();
  update(clickCell(state, cell, 'note'));
});
boardEl.addEventListener('pointermove', (e) => {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
});
boardEl.addEventListener('pointercancel', cancelPress);
boardEl.addEventListener('pointerleave', cancelPress);
boardEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  // On touch screens a long press also fires contextmenu: that gesture already placed someone.
  const el = cellEl(e);
  if (!state || !el || lastPointer !== 'mouse') return;
  update(clickCell(state, Number(el.dataset.cell), 'mark'));
});

// Clue focus: hovering a clue (or tapping it, on touch screens) highlights the cells it talks about;
// hovering a card highlights where that person has been placed.
let hoverClue: number | null = null;
let pinnedClue: number | null = null;
let hoverPerson: string | null = null;

function applyFocus(): void {
  if (!state) return;
  const clueIndex = hoverClue ?? pinnedClue ?? state.hint?.clueIndex ?? null;
  const clue = clueIndex === null ? undefined : state.level.puzzle.clues[clueIndex];
  const cells = new Set(clue ? clueFocusCells(clue, state.level.puzzle.board) : []);
  const personCell = hoverPerson === null ? undefined : state.placements[hoverPerson];
  for (const el of boardEl.querySelectorAll<HTMLElement>('.cell')) {
    const cell = Number(el.dataset.cell);
    el.classList.toggle('focus', cells.has(cell));
    el.classList.toggle('focus-person', cell === personCell);
  }
  boardEl.classList.toggle('focusing', cells.size > 0);
  for (const p of cluesEl.querySelectorAll<HTMLElement>('p[data-clue]'))
    p.classList.toggle('focus', Number(p.dataset.clue) === clueIndex);
}

cluesEl.addEventListener('mouseover', (e) => {
  const target = e.target as HTMLElement;
  const line = target.closest<HTMLElement>('p[data-clue]');
  hoverClue = line ? Number(line.dataset.clue) : null;
  hoverPerson = target.closest<HTMLElement>('.card[data-person]')?.dataset.person ?? null;
  applyFocus();
});
cluesEl.addEventListener('mouseleave', () => {
  hoverClue = hoverPerson = null;
  applyFocus();
});
cluesEl.addEventListener('click', (e) => {
  if (!state) return;
  const target = e.target as HTMLElement;
  const line = target.closest<HTMLElement>('p[data-clue]');
  if (line) pinnedClue = pinnedClue === Number(line.dataset.clue) ? null : Number(line.dataset.clue);
  const person = target.closest<HTMLElement>('.card[data-person]')?.dataset.person;
  if (person) update(selectPerson(state, person));
  else applyFocus();
});

toolsEl.addEventListener('click', (e) => {
  if (!state) return;
  const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
  if (btn?.dataset.person) update(selectPerson(state, btn.dataset.person));
  else if (btn?.dataset.action === 'undo') update(undo(state));
  else if (btn?.dataset.action === 'hint') update(hint(state));
  else if (btn?.dataset.mode) update({ ...state, mode: btn.dataset.mode as Mode });
});
accuseEl.addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>('button')?.dataset.accuse;
  if (!state || !id) return;
  update({ ...state, accusation: state.accusation === id ? null : id, message: null });
});
$('check').addEventListener('click', () => state && update(check(state)));
$('solution').addEventListener('click', () => state && update(toggleSolution(state)));
$('new').addEventListener('click', () => load(readParams(randomSeed())));
$('load-seed').addEventListener('click', () => load(readParams(seedEl.value.trim() || randomSeed())));
seedEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') load(readParams(seedEl.value.trim() || randomSeed()));
});
$('reset').addEventListener('click', () => state && update(newGame(state.level)));
$('share').addEventListener('click', async () => {
  if (!state) return;
  const url = shareUrl(state.level.params);
  try {
    await navigator.clipboard.writeText(url);
    setMessage('Enlace del caso copiado al portapapeles.', 'ok');
  } catch {
    setMessage(url);
  }
});
$('export').addEventListener('click', () => {
  if (state) jsonEl.value = levelToJson(state.level, true);
});
$('import').addEventListener('click', () => {
  try {
    const level = levelFromJson(jsonEl.value);
    const errors = checkLevelInvariants(level);
    if (errors.length) throw new Error(errors.join('; '));
    seedEl.value = level.params.seed;
    update(newGame(level));
  } catch (e) {
    setMessage(`JSON no válido: ${(e as Error).message}`, 'err');
  }
});

// Keyboard: person letters select a pawn; P/X/Backspace switch tool; Ctrl+Z undoes.
document.addEventListener('keydown', (e) => {
  if (!state || (e.target as HTMLElement).closest('input, textarea, select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    return update(undo(state));
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toUpperCase();
  const person = state.level.puzzle.people.find((p) => p.id === key);
  const modes: Record<string, Mode> = { P: 'play', X: 'mark', BACKSPACE: 'erase', DELETE: 'erase' };
  if (person) update(selectPerson(state, person.id));
  else if (modes[key]) update({ ...state, mode: modes[key] });
  else return;
  e.preventDefault();
});

// Initial level: from the URL hash (shareable) or a random seed.
const hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('size')) sizeEl.value = hash.get('size')!;
if (hash.get('scenarioId')) scenarioEl.value = hash.get('scenarioId')!;
if (hash.get('difficulty')) difficultyEl.value = hash.get('difficulty')!;
load(readParams(hash.get('seed') ?? randomSeed()));
