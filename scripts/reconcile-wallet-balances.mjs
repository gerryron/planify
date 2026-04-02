import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const applyMode = process.argv.includes('--apply');

const query = `
WITH wallet_recomputed AS (
  SELECT
    w.id,
    w."userId",
    w.name,
    w.balance AS current_balance,
    COALESCE(
      SUM(
        CASE
          WHEN c.type = 'income' THEN
            CASE WHEN w."walletKind" = 'credit_card' THEN -cl.amount ELSE cl.amount END
          WHEN c.type = 'outcome' THEN
            CASE WHEN w."walletKind" = 'credit_card' THEN cl.amount ELSE -cl.amount END
          ELSE 0
        END
      ),
      0
    )::int AS expected_balance
  FROM "Wallet" w
  LEFT JOIN "CashLog" cl
    ON cl."userId" = w."userId"
   AND lower(cl."walletName") = lower(w.name)
  LEFT JOIN "Category" c
    ON c.id = cl."categoryId"
  GROUP BY w.id, w."userId", w.name, w.balance, w."walletKind"
),
mismatches AS (
  SELECT *
  FROM wallet_recomputed
  WHERE current_balance <> expected_balance
),
updated AS (
  UPDATE "Wallet" w
  SET balance = m.expected_balance
  FROM mismatches m
  WHERE w.id = m.id
    AND ${applyMode ? 'TRUE' : 'FALSE'}
  RETURNING w.id
)
SELECT
  m.id,
  m."userId",
  m.name,
  m.current_balance,
  m.expected_balance,
  (m.expected_balance - m.current_balance) AS delta
FROM mismatches m
ORDER BY m."userId", m.name;
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(query);
    const rows = result.rows;

    console.log(
      applyMode
        ? 'Mode: APPLY (wallet balances updated)'
        : 'Mode: DRY RUN (no data changed)',
    );

    if (rows.length === 0) {
      console.log('All wallet balances are already aligned with cash logs.');
      return;
    }

    console.table(rows);
    console.log(`Mismatched wallets: ${rows.length}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Failed to reconcile wallet balances:', error);
  process.exit(1);
});
