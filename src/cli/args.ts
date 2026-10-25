/** Tiny `--key value` / `--flag` parser (avoids a dependency for two scripts). */
export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) continue;
    const [key, inline] = a.slice(2).split('=', 2) as [string, string | undefined];
    if (inline !== undefined) out[key] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1]!.startsWith('--')) out[key] = argv[++i]!;
    else out[key] = true;
  }
  return out;
}
