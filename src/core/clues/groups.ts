import type { Person, Puzzle } from '../model/types';
import { clueText, cluePersons } from './registry';
import { victimClueText } from './text';

export interface ClueLine {
  text: string;
  /** Index in puzzle.clues; null for the victim's fixed clue. */
  clueIndex: number | null;
}

export interface ClueGroup {
  /** Null for the 'General' group (clues about no particular person). */
  person: Person | null;
  lines: ClueLine[];
}

/**
 * Clues grouped for display: one group per suspect in letter order (A, B, C...), each clue listed
 * once under the first person it mentions; then 'General' (global clues); the victim last.
 * Empty suspect groups are kept so every person has a card.
 */
export function puzzleClueGroups(puzzle: Puzzle): ClueGroup[] {
  const { board, people, clues } = puzzle;
  const suspects = people.filter((p) => !p.isVictim).sort((a, b) => a.id.localeCompare(b.id));
  const victim = people.find((p) => p.isVictim)!;
  const byPerson = new Map<string, ClueLine[]>(suspects.map((p) => [p.id, []]));
  const general: ClueLine[] = [];
  clues.forEach((clue, clueIndex) => {
    const line = { text: clueText(clue, board, people), clueIndex };
    const owner = cluePersons(clue)[0];
    const bucket = owner !== undefined ? byPerson.get(owner) : undefined;
    (bucket ?? general).push(line);
  });
  const groups: ClueGroup[] = suspects.map((p) => ({ person: p, lines: byPerson.get(p.id)! }));
  if (general.length) groups.push({ person: null, lines: general });
  groups.push({ person: victim, lines: [{ text: victimClueText(victim.name), clueIndex: null }] });
  return groups;
}

/** Flat list of clue sentences in display order. */
export function puzzleClueTexts(puzzle: Puzzle): string[] {
  return puzzleClueGroups(puzzle).flatMap((g) => g.lines.map((l) => l.text));
}
