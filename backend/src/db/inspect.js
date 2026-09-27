// Quick way to look at what's in the database without installing a GUI tool.
// Usage: npm run db:inspect          (prints every table)
//        npm run db:inspect users    (prints just one table)
require('dotenv').config();
const db = require('./index');

async function main() {
  const requested = process.argv[2];

  let tables = (await db.prepare(
    "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'"
  ).all()).map((t) => t.name);

  if (requested && !tables.includes(requested)) {
    console.log(`No table named "${requested}". Available tables:`);
    tables.forEach((name) => console.log(' -', name));
    process.exit(1);
  }

  if (requested) tables = tables.filter((name) => name === requested);

  for (const table of tables) {
    const rows = await db.prepare(`SELECT * FROM ${table}`).all();
    console.log(`\n=== ${table} (${rows.length} row${rows.length === 1 ? '' : 's'}) ===`);
    if (rows.length === 0) {
      console.log('(empty)');
    } else {
      console.table(rows);
    }
  }

  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
