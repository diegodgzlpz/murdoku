import './styles.css';
import {
  checkLevelInvariants,
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
import { check, clickCell, newGame, selectPerson, type GameState, type Mode } from './state';

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

const cellOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.cell;

boardEl.addEventListener('click', (e) => {
  const cell = cellOf(e);
  if (!state || cell === undefined) return;
  update(clickCell(state, Number(cell), e.shiftKey ? 'note' : state.mode));
});
boardEl.addEventListener('contextmenu', (e) => {
  const cell = cellOf(e);
  if (!state || cell === undefined) return;
  e.preventDefault();
  update(clickCell(state, Number(cell), 'mark'));
});
toolsEl.addEventListener('click', (e) => {
  if (!state) return;
  const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
  if (btn?.dataset.person) update(selectPerson(state, btn.dataset.person));
  else if (btn?.dataset.mode) update({ ...state, mode: btn.dataset.mode as Mode });
});
accuseEl.addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>('button')?.dataset.accuse;
  if (!state || !id) return;
  update({ ...state, accusation: state.accusation === id ? null : id, message: null });
});
$('check').addEventListener('click', () => state && update(check(state)));
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

// Keyboard: person letters select a pawn; P/N/X/Backspace switch mode.
document.addEventListener('keydown', (e) => {
  if (!state || e.ctrlKey || e.metaKey || e.altKey) return;
  if ((e.target as HTMLElement).closest('input, textarea, select')) return;
  const key = e.key.toUpperCase();
  const person = state.level.puzzle.people.find((p) => p.id === key);
  const modes: Record<string, Mode> = { P: 'place', N: 'note', X: 'mark', BACKSPACE: 'erase', DELETE: 'erase' };
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
