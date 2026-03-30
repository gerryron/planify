import { prisma } from '@/core/db/prisma';
import { hashPassword, verifyPassword } from '@/core/auth/password';

const LEGACY_EMAIL = 'legacy.user@planify.local';

let ensureSuperadminPromise: Promise<void> | null = null;

function getConfiguredSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = process.env.SUPERADMIN_PASSWORD ?? '';
  const name = process.env.SUPERADMIN_NAME?.trim() || 'Super Admin';

  if (!email || !password) {
    return null;
  }

  return { email, password, name };
}

async function resetSuperadminOwnedData(userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.cashLog.deleteMany({ where: { userId } });
    await tx.monthlyBudget.deleteMany({ where: { userId } });
    await tx.wallet.deleteMany({ where: { userId } });
    await tx.category.deleteMany({ where: { userId } });
  });
}

export function ensureConfiguredSuperadmin(): Promise<void> {
  if (ensureSuperadminPromise) {
    return ensureSuperadminPromise;
  }

  ensureSuperadminPromise = (async () => {
    const config = getConfiguredSuperadmin();

    if (!config) {
      console.warn(
        'SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are not set. Admin bootstrap is skipped.',
      );
      return;
    }

    let superadminId: string;

    const existing = await prisma.user.findUnique({
      where: { email: config.email },
      select: {
        id: true,
        name: true,
        passwordHash: true,
      },
    });

    if (existing) {
      const isPasswordMatch = await verifyPassword(
        config.password,
        existing.passwordHash,
      );

      if (!isPasswordMatch) {
        // On credential rotation, reset admin-owned finance data and refresh password hash.
        await resetSuperadminOwnedData(existing.id);
      }

      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: config.name,
          role: 'superadmin',
          status: 'active',
          ...(isPasswordMatch
            ? {}
            : { passwordHash: await hashPassword(config.password) }),
        },
      });

      superadminId = existing.id;
    } else {
      const created = await prisma.user.create({
        data: {
          name: config.name,
          email: config.email,
          passwordHash: await hashPassword(config.password),
          role: 'superadmin',
          status: 'active',
        },
        select: { id: true },
      });

      superadminId = created.id;
    }

    await prisma.wallet.upsert({
      where: {
        userId_name: {
          userId: superadminId,
          name: 'Cash',
        },
      },
      update: {},
      create: {
        userId: superadminId,
        name: 'Cash',
        balance: 0,
        excludeFromTotal: false,
        walletKind: 'basic',
        sortOrder: 0,
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: LEGACY_EMAIL },
          {
            role: 'superadmin',
            email: { not: config.email },
          },
        ],
      },
    });
  })().catch((error) => {
    console.error('Failed to ensure configured superadmin:', error);
  });

  return ensureSuperadminPromise;
}
