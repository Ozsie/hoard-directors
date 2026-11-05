import type { Director } from './director';

// The discovery half of the director shell: id and alias resolution over a
// caller-owned registry. The consumer builds the registry however it
// likes (a static import map, a build-time folder scan, a plugin cache);
// the aliases and the default id are consumer knowledge, because every
// alias table is content. This module owns only the lookup order: alias,
// then id, then the default, then the first registered director.

/** Options for `createDirectorRegistry` — the registry the consumer owns. */
export interface DirectorRegistryOptions<DirectorT extends Director> {
  /** Directors keyed by id — read live, so late registrations are visible. */
  directors: Record<string, DirectorT>;
  /** Alias-to-id map: difficulty words, spelling variants, legacy names. */
  aliases?: Record<string, string>;
  /** Fallback id when nothing else resolves; then the first director. */
  defaultId?: string;
}

/** Resolves ids and aliases against the consumer's registry. */
export interface DirectorRegistry<DirectorT extends Director> {
  /** Registers a director under its id, replacing any previous entry. */
  register(director: DirectorT): void;
  /** Whether an id or alias maps to a registered director. */
  isKnown(idOrAlias: string): boolean;
  /**
   * Resolves an id or alias through the fallback chain; `undefined` only
   * when the registry is empty. Unresolvable ids fall back to the default
   * id, and a missing default to the first registered director.
   */
  resolve(idOrAlias?: string): DirectorT | undefined;
}

export const createDirectorRegistry = <DirectorT extends Director>(
  options: DirectorRegistryOptions<DirectorT>,
): DirectorRegistry<DirectorT> => {
  const has = (id: string): boolean =>
    Object.prototype.hasOwnProperty.call(options.directors, id) &&
    options.directors[id] !== undefined;

  const resolveAlias = (idOrAlias: string): string =>
    options.aliases &&
    Object.prototype.hasOwnProperty.call(options.aliases, idOrAlias)
      ? options.aliases[idOrAlias]
      : idOrAlias;

  return {
    register: (director: DirectorT): void => {
      options.directors[director.id] = director;
    },

    isKnown: (idOrAlias: string): boolean => has(resolveAlias(idOrAlias)),

    resolve: (idOrAlias?: string): DirectorT | undefined => {
      if (idOrAlias !== undefined) {
        const id = resolveAlias(idOrAlias);
        if (has(id)) {
          return options.directors[id];
        }
      }
      if (options.defaultId !== undefined && has(options.defaultId)) {
        return options.directors[options.defaultId];
      }
      return Object.values(options.directors)[0];
    },
  };
};
