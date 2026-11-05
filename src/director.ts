// A director is the shell every game-master-style system fills: an id
// plus, optionally, a factory for per-run state. The concrete
// personalities and every text they can produce are game content and stay
// with the game; this module owns only the tiny identity contract the
// registry and the dispatcher build on.

/**
 * The minimal shape every director satisfies: an identity plus an
 * optional factory for per-run state. The consumer's director type
 * extends this structurally with its own hooks and data — never through
 * an import.
 */
export interface Director<TState = unknown> {
  /** Unique identifier; the registry key and the alias-resolution target. */
  readonly id: string;
  /**
   * Factory for the director's per-run state. The consumer calls it when
   * a run starts and persists the result however it saves games; the
   * package never sees it again.
   */
  initialState?: () => TState;
}
