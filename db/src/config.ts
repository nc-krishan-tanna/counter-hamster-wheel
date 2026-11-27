/** Raised when required environment variables are missing; names only, never values (NFR5.2). */
export class MissingEnvError extends Error {
  readonly missing: readonly string[];
  constructor(missing: readonly string[]) {
    super(`Missing required environment variables: ${missing.join(', ')}`);
    this.missing = missing;
  }
}

/** Returns the named variables, or throws listing every missing name. */
export function requireEnv<const K extends string>(
  names: readonly K[],
  env: NodeJS.ProcessEnv = process.env,
): Record<K, string> {
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) throw new MissingEnvError(missing);
  return Object.fromEntries(names.map((name) => [name, env[name]])) as Record<K, string>;
}

/** Startup check: print the missing names and exit, so a container never runs half-configured. */
export function requireEnvOrExit<const K extends string>(
  names: readonly K[],
  env: NodeJS.ProcessEnv = process.env,
): Record<K, string> {
  try {
    return requireEnv(names, env);
  } catch (error) {
    if (!(error instanceof MissingEnvError)) throw error;
    console.error(error.message);
    process.exit(1);
  }
}

/** The migrate step's variables; the seed variables are optional and read by the seed. */
export const MIGRATE_ENV = ['DATABASE_URL_MIGRATE', 'BETTER_AUTH_SECRET'] as const;

export function migrateConfig(env: NodeJS.ProcessEnv = process.env) {
  return requireEnvOrExit(MIGRATE_ENV, env);
}
