/**
 * Fails a deployment early when the database URL the app will dial is not one
 * @prisma/adapter-pg can use.
 *
 * Runs inside the build, where the real (Sensitive) environment variables
 * exist — they cannot be read back with `vercel env pull`, so this is the only
 * place the choice can be checked before the app is serving traffic. It prints
 * the variable name and the URL scheme only, never the value.
 */
const candidates = ["POSTGRES_URL", "DATABASE_URL"];
const chosen = candidates
  .map((name) => [name, process.env[name]?.trim() ?? ""])
  .find(([, value]) => value.length > 0);

if (!chosen) {
  console.error("No database URL in the build environment: expected POSTGRES_URL or DATABASE_URL.");
  process.exit(1);
}

const [name, value] = chosen;
const scheme = value.slice(0, value.indexOf(":") === -1 ? value.length : value.indexOf(":"));
console.log(`Database URL source: ${name} (scheme: ${scheme})`);

if (!/^postgres(ql)?$/.test(scheme)) {
  console.error(
    `The app dials Postgres through @prisma/adapter-pg, which needs a postgres:// URL, but ${name} is "${scheme}://". ` +
      "Set POSTGRES_URL to the direct connection string of the database.",
  );
  process.exit(1);
}
