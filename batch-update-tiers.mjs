import { createConnection } from '/home/ubuntu/bell-carpets-quote/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js';

const conn = await createConnection(process.env.DATABASE_URL);

// New tier product data
const GOOD = {
  name: 'Godfrey Hirst Enforcer',
  productUrl: 'https://www.bellcarpets.com.au/products/godfrey-hirst-enforcer',
};
const BETTER = {
  name: 'Godfrey Hirst Serina',
  productUrl: 'https://www.bellcarpets.com.au/products/godfrey-hirst-serina',
};
const BEST = {
  name: 'Victoria Carpets Lemar Twist',
  productUrl: 'https://www.bellcarpets.com.au/products/victoria-carpets-lemar-twist',
};

// Fetch all non-deleted quotes
const [rows] = await conn.execute(
  `SELECT id, quoteNumber, jobStatus, configJson FROM quotes WHERE deletedAt IS NULL ORDER BY id`
);

console.log(`Found ${rows.length} quotes to process`);

let updated = 0;
let skipped = 0;

for (const row of rows) {
  let config;
  try {
    config = typeof row.configJson === 'string' ? JSON.parse(row.configJson) : row.configJson;
  } catch {
    console.log(`  SKIP ${row.quoteNumber}: invalid JSON`);
    skipped++;
    continue;
  }

  if (!config || !Array.isArray(config.tiers) || config.tiers.length === 0) {
    console.log(`  SKIP ${row.quoteNumber}: no tiers array`);
    skipped++;
    continue;
  }

  let changed = false;

  for (const tier of config.tiers) {
    const label = (tier.label || '').toUpperCase();
    let target = null;
    if (label === 'GOOD') target = GOOD;
    else if (label === 'BETTER') target = BETTER;
    else if (label === 'BEST') target = BEST;

    if (!target) continue;

    // Update product name and URL, preserve price and everything else
    if (tier.productName !== target.name || tier.productUrl !== target.productUrl) {
      const oldName = tier.productName;
      tier.productName = target.name;
      tier.productUrl = target.productUrl;
      // Remove colour swatches
      if (Array.isArray(tier.colours)) tier.colours = [];
      changed = true;
      console.log(`  ${row.quoteNumber} [${label}]: "${oldName}" → "${target.name}"`);
    }
  }

  if (changed) {
    await conn.execute(
      `UPDATE quotes SET configJson = ? WHERE id = ?`,
      [JSON.stringify(config), row.id]
    );
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
await conn.end();
