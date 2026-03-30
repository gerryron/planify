-- Add explicit transfer group linkage for paired transfer cash logs

ALTER TABLE "CashLog"
ADD COLUMN IF NOT EXISTS "transferGroupId" TEXT;

-- Backfill legacy transfer pairs that have clear wallet direction in description.
WITH transfer_out AS (
	SELECT
		c.id,
		c."userId",
		c.date,
		c.amount,
		c."walletName" AS from_wallet,
		substring(c.description FROM '^Transfer to (.+)$') AS to_wallet,
		row_number() OVER (
			PARTITION BY c."userId", c.date, c.amount, c."walletName", substring(c.description FROM '^Transfer to (.+)$')
			ORDER BY c.id
		) AS rn
	FROM "CashLog" c
	JOIN "Category" k ON k.id = c."categoryId"
	WHERE c."transferGroupId" IS NULL
		AND c."excludeFromReport" = true
		AND k.type = 'outcome'
		AND k.name IN ('Wallet Transfer Out', 'Transfer Out')
		AND c.description LIKE 'Transfer to %'
),
transfer_in AS (
	SELECT
		c.id,
		c."userId",
		c.date,
		c.amount,
		substring(c.description FROM '^Transfer from (.+)$') AS from_wallet,
		c."walletName" AS to_wallet,
		row_number() OVER (
			PARTITION BY c."userId", c.date, c.amount, substring(c.description FROM '^Transfer from (.+)$'), c."walletName"
			ORDER BY c.id
		) AS rn
	FROM "CashLog" c
	JOIN "Category" k ON k.id = c."categoryId"
	WHERE c."transferGroupId" IS NULL
		AND c."excludeFromReport" = true
		AND k.type = 'income'
		AND k.name IN ('Wallet Transfer In', 'Transfer In')
		AND c.description LIKE 'Transfer from %'
),
paired_by_wallet_direction AS (
	SELECT
		o.id AS out_id,
		i.id AS in_id,
		concat('legacy-transfer-', LEAST(o.id, i.id), '-', GREATEST(o.id, i.id)) AS grp
	FROM transfer_out o
	JOIN transfer_in i
		ON i."userId" = o."userId"
	 AND i.date = o.date
	 AND i.amount = o.amount
	 AND i.from_wallet = o.from_wallet
	 AND i.to_wallet = o.to_wallet
	 AND i.rn = o.rn
)
UPDATE "CashLog" c
SET "transferGroupId" = p.grp
FROM paired_by_wallet_direction p
WHERE c.id IN (p.out_id, p.in_id)
	AND c."transferGroupId" IS NULL;

-- Backfill legacy transfer pairs with custom same-note description (best effort).
WITH transfer_out AS (
	SELECT
		c.id,
		c."userId",
		c.date,
		c.amount,
		c.description,
		row_number() OVER (
			PARTITION BY c."userId", c.date, c.amount, c.description
			ORDER BY c.id
		) AS rn
	FROM "CashLog" c
	JOIN "Category" k ON k.id = c."categoryId"
	WHERE c."transferGroupId" IS NULL
		AND c."excludeFromReport" = true
		AND k.type = 'outcome'
		AND k.name IN ('Wallet Transfer Out', 'Transfer Out')
		AND c.description IS NOT NULL
		AND c.description <> ''
		AND c.description NOT LIKE 'Transfer to %'
),
transfer_in AS (
	SELECT
		c.id,
		c."userId",
		c.date,
		c.amount,
		c.description,
		row_number() OVER (
			PARTITION BY c."userId", c.date, c.amount, c.description
			ORDER BY c.id
		) AS rn
	FROM "CashLog" c
	JOIN "Category" k ON k.id = c."categoryId"
	WHERE c."transferGroupId" IS NULL
		AND c."excludeFromReport" = true
		AND k.type = 'income'
		AND k.name IN ('Wallet Transfer In', 'Transfer In')
		AND c.description IS NOT NULL
		AND c.description <> ''
		AND c.description NOT LIKE 'Transfer from %'
),
paired_by_same_note AS (
	SELECT
		o.id AS out_id,
		i.id AS in_id,
		concat('legacy-transfer-', LEAST(o.id, i.id), '-', GREATEST(o.id, i.id)) AS grp
	FROM transfer_out o
	JOIN transfer_in i
		ON i."userId" = o."userId"
	 AND i.date = o.date
	 AND i.amount = o.amount
	 AND i.description = o.description
	 AND i.rn = o.rn
)
UPDATE "CashLog" c
SET "transferGroupId" = p.grp
FROM paired_by_same_note p
WHERE c.id IN (p.out_id, p.in_id)
	AND c."transferGroupId" IS NULL;

CREATE INDEX IF NOT EXISTS "CashLog_userId_transferGroupId_idx"
ON "CashLog"("userId", "transferGroupId");
