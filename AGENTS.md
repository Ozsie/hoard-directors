# AGENTS.md — @hoard-engine/directors

This is a HOARD engine package

## What this package is

- The director framework extracted from the game — the hook/dispatch
  shell for game-master-style systems (Left 4 Dead-style difficulty
  directors): the director identity contract (`Director`), hook
  dispatch (emitting a named event to an optional hook on a plain
  object host, returning the hook's result or `undefined` when absent),
  override resolution (the first group defining an event wins over the
  base host — nested `rules`-style groups resolve uniformly) and
  id/alias registry resolution (alias, then id, then the default, then
  the first registered). It is a dependency-free leaf: game-agnostic,
  browser-free and cadence-agnostic — the consumer decides when an
  event is emitted (this game's cadence is turn-bound; a real-time game
  emits the same events from its scheduler).
- The game consumes it as a `@hoard-engine/directors` dependency and
  keeps the knowledge at the historical facades: the concrete game
  masters and all their texts (`src/gameMasters/*/gameMaster.ts`), the
  alias table and default id (`src/gameMasters/index.ts`) and the
  hook maps (lifecycle, search/combat rules, event interception in
  `src/types.ts`) — per the framework/content split. The game's turn
  flow, combat, search and event deck emit through the dispatcher and
  the resolver at their historical call sites.
- Like every HOARD engine package, it is designed to be pluggable and
  interoperable, and as standalone as possible: individually adoptable,
  swappable and usable without any other HOARD package, game or
  framework. Packages compose through data — minimal shapes, callback
  seams, plain values — never through shared state; a new dependency or
  a sibling import here is a design regression, not an optimization.

## Hard boundaries

- Only relative imports inside `src/`. No imports from game code,
  Svelte, i18n, node builtins or any package — enforced by an eslint
  `no-restricted-syntax` override and `src/boundary.test.ts`. Tests may
  import `vitest` and `node:` builtins.
- The public surface is exactly `src/index.ts`; every export must be
  re-exported there (`src/publicSurface.test.ts` fails otherwise).
- No browser or window globals in package sources — the sentinel test
  in `src/boundary.test.ts` fails on `localStorage`/`window`/`document`
  references; the dispatcher resolves and calls plain functions, so
  tests run in plain Node with synthetic directors and hook maps.
- The API is deliberately game-agnostic. The game owns every hook
  signature, every director personality and every text they can
  produce, the alias table and the default id; the package owns only
  the lookup order, the override precedence and the dispatch mechanics.
- Game content (director personalities, texts, tuned values) stays in
  the game; this package contains no content by construction.

## Commands

Standalone (from this folder):

```bash
npm test          # vitest (boundary, public-surface and unit tests)
npm run check     # tsc --noEmit (strict)
npm run lint      # eslint over src and vitest.config.ts
npm run prettier  # prettier --check (fix via prettier:format)
npm run build     # tsc declarations + esbuild ESM bundle to dist/
```

Run `npm run check`, `npm test`, and `npm run lint` before considering
work done. The game runs its own `check`/`test`/`lint` over the facades
on top.

## Conventions

- Prettier: single quotes, 2-space indent, trailing commas. Strict
  TypeScript: no `any`, no `console`.
- Tests are colocated as `*.test.ts` next to the code they cover and
  run in plain Node (no DOM, no browser): directors and hook maps are
  synthetic. Behavior that needs the real game masters or state shapes
  stays in the game.
- `dist/` is build output: never edit it, never commit it.
- Publishing (`npm publish` from this folder) runs check + build +
  test via `prepublishOnly`. Bump `version` first. The package has no
  `license` field yet — that is a decision for the repo owner, do not
  add one unilaterally.
