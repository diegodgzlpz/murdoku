import './styles.css';
import {
  DIFFICULTIES,
  generateLevel,
  levelFromJson,
  levelToJson,
  checkLevelInvariants,
  randomSeed,
  SCENARIOS,
  MIN_SIZE,
  MAX_SIZE,
  type Difficulty,
  type GenerationParams,
} from '../core/index';
import { renderAccuse, renderBoard, renderClues, renderTools } from './render';
import { check, clickCell, newGame, toggleMark, type GameState } from './state';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const boardEl = $<HTMLDivElement>('board');
const cluesEl = $<HTMLOListElement>('clues');
const toolsEl = $<HTMLDivElement>('tools');
const accuseEl = $<HTMLSelectElement>('accuse');
const msgEl = $<HTMLParagraphElement>('message');
const infoEl = $<HTMLSpanElement>('info');
const sizeEl = $<HTMLSelectElement>('size');
const scenarioEl = $<HTMLSelectElement>('scenario');
const difficultyEl = $<HTMLSelectElement>('difficulty');
const seedEl = $<HTMLInputElement>('seed');
const jsonEl = $<HTMLTextAreaElement>('json');

sizeEl.innerHTML = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i)
  .map((n) => `<option value="${n}" ${n === 7 ? 'selected' : ''}>${n}×${n}</option>`)
  .join('');
scenarioEl.innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
const DIFF_NAMES: Record<Difficulty, string> = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
difficultyEl.innerHTML = DIFFICULTIES.map((d) => `<option value="${d}" ${d === 'medium' ? 'selected' : ''}>${DIFF_NAMES[d]}</option>`).join('');

let state: GameState | null = null;

function render(): void {
  if (!state) return;
  renderBoard(boardEl, state);
  renderClues(cluesEl, state);
  renderTools(toolsEl, state);
  renderAccuse(accuseEl, state);
  msgEl.textContent = state.message?.text ?? '';
  msgEl.className = state.message ? (state.message.ok ? 'ok' : 'err') : '';
  const p = state.level.params;
  infoEl.textContent = `seed: ${p.seed} · ${p.size}×${p.size} · ${p.scenarioId} · ${p.difficulty} · ${state.level.stats.ms} ms`;
}

function readParams(seed: string): GenerationParams {
  return {
    size: Number(sizeEl.value),
    seed,
    scenarioId: scenarioEl.value,
    difficulty: difficultyEl.value as Difficulty,
  };
}

function load(params: GenerationParams): void {
  msgEl.textContent = 'Generando…';
  msgEl.className = '';
  // Let the browser paint the message before the (synchronous) generation.
  setTimeout(() => {
    try {
      state = newGame(generateLevel(params));
      seedEl.value = params.seed;
      history.replaceState(null, '', `#${new URLSearchParams({ ...params, size: String(params.size) })}`);
      render();
    } catch (e) {
      msgEl.textContent = `Error al generar: ${(e as Error).message}`;
      msgEl.className = 'err';
    }
  }, 10);
}

boardEl.addEventListener('click', (e) => {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.cell;
  if (state && cell !== undefined) {
    state = clickCell(state, Number(cell));
    render();
  }
});
boardEl.addEventListener('contextmenu', (e) => {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell')?.dataset.cell;
  if (state && cell !== undefined) {
    e.preventDefault();
    state = toggleMark(state, Number(cell));
    render();
  }
});
toolsEl.addEventListener('click', (e) => {
  const tool = (e.target as HTMLElement).closest<HTMLElement>('button')?.dataset.tool;
  if (!state || !tool) return;
  state = {
    ...state,
    tool: tool.startsWith('person:') ? { kind: 'person', id: tool.slice(7) } : { kind: tool as 'mark' | 'erase' },
  };
  render();
});
accuseEl.addEventListener('change', () => {
  if (!state) return;
  state = { ...state, accusation: accuseEl.value || null, message: null };
  render();
});
$('check').addEventListener('click', () => {
  if (!state) return;
  state = check(state);
  render();
});
$('new').addEventListener('click', () => load(readParams(randomSeed())));
$('load-seed').addEventListener('click', () => load(readParams(seedEl.value.trim() || randomSeed())));
$('reset').addEventListener('click', () => {
  if (!state) return;
  state = newGame(state.level);
  render();
});
$('export').addEventListener('click', () => {
  if (state) jsonEl.value = levelToJson(state.level, true);
});
$('import').addEventListener('click', () => {
  try {
    const level = levelFromJson(jsonEl.value);
    const errors = checkLevelInvariants(level);
    if (errors.length) throw new Error(errors.join('; '));
    state = newGame(level);
    seedEl.value = level.params.seed;
    render();
  } catch (e) {
    msgEl.textContent = `JSON no válido: ${(e as Error).message}`;
    msgEl.className = 'err';
  }
});

// Initial level: from the URL hash (shareable) or a random seed.
const hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('size')) sizeEl.value = hash.get('size')!;
if (hash.get('scenarioId')) scenarioEl.value = hash.get('scenarioId')!;
if (hash.get('difficulty')) difficultyEl.value = hash.get('difficulty')!;
load(readParams(hash.get('seed') ?? randomSeed()));
