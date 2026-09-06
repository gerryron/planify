type MockUser = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  status: string;
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  wallet: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  cashLog: { deleteMany: jest.fn() },
  monthlyBudget: { deleteMany: jest.fn() },
  category: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@/core/db/prisma', () => ({ prisma: mockPrisma }));

const mockVerifyPassword = jest.fn();
const mockHashPassword = jest.fn();

jest.mock('@/core/auth/password', () => ({
  verifyPassword: mockVerifyPassword,
  hashPassword: mockHashPassword,
}));

const SUPERADMIN_EMAIL = 'admin@planify.local';

async function runBootstrap(existing: MockUser | null) {
  jest.resetModules();
  const fresh = await import('./ensureSuperadmin');

  process.env.SUPERADMIN_EMAIL = SUPERADMIN_EMAIL;
  process.env.SUPERADMIN_PASSWORD = 'super-secret';
  process.env.SUPERADMIN_NAME = 'Super Admin';

  mockPrisma.user.findUnique.mockResolvedValue(existing);
  mockPrisma.user.update.mockResolvedValue(undefined);
  mockPrisma.user.create.mockResolvedValue({ id: 9 });
  mockPrisma.user.delete.mockResolvedValue(undefined);
  mockPrisma.user.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.wallet.upsert.mockResolvedValue(undefined);
  mockPrisma.wallet.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.cashLog.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.monthlyBudget.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.category.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.$transaction = jest.fn(
    (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma),
  );

  await fresh.ensureConfiguredSuperadmin();
  return fresh;
}

describe('ensureConfiguredSuperadmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyPassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue('new-hash');
    delete process.env.SUPERADMIN_EMAIL;
    delete process.env.SUPERADMIN_PASSWORD;
    delete process.env.SUPERADMIN_NAME;
  });

  afterEach(() => {
    delete process.env.SUPERADMIN_EMAIL;
    delete process.env.SUPERADMIN_PASSWORD;
    delete process.env.SUPERADMIN_NAME;
  });

  it('should skip bootstrap when env credentials are not configured', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.resetModules();
    const fresh = await import('./ensureSuperadmin');

    await fresh.ensureConfiguredSuperadmin();

    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should refresh role and status for an existing superadmin without resetting data', async () => {
    const existing: MockUser = {
      id: 7,
      email: SUPERADMIN_EMAIL,
      name: 'Old Name',
      passwordHash: 'old-hash',
      role: 'user',
      status: 'pending',
    };
    await runBootstrap(existing);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        name: 'Super Admin',
        role: 'superadmin',
        status: 'active',
      },
    });
    expect(mockPrisma.cashLog.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.wallet.upsert).toHaveBeenCalled();
  });

  it('should reset admin-owned data and refresh the password on credential rotation', async () => {
    const existing: MockUser = {
      id: 7,
      email: SUPERADMIN_EMAIL,
      name: 'Old Name',
      passwordHash: 'old-hash',
      role: 'superadmin',
      status: 'active',
    };
    mockVerifyPassword.mockResolvedValue(false);

    await runBootstrap(existing);

    expect(mockPrisma.cashLog.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
    expect(mockPrisma.monthlyBudget.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
    expect(mockPrisma.wallet.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
    expect(mockPrisma.category.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        name: 'Super Admin',
        role: 'superadmin',
        status: 'active',
        passwordHash: 'new-hash',
      },
    });
  });

  it('should create the superadmin when none exists', async () => {
    await runBootstrap(null);

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Super Admin',
        email: SUPERADMIN_EMAIL,
        passwordHash: 'new-hash',
        role: 'superadmin',
        status: 'active',
      },
      select: { id: true },
    });
    expect(mockPrisma.wallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_name: { userId: 9, name: 'Cash' } },
        create: expect.objectContaining({ name: 'Cash', walletKind: 'basic' }),
      }),
    );
  });

  it('should remove the legacy user and other superadmins', async () => {
    await runBootstrap(null);

    expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: 'legacy.user@planify.local' },
          { role: 'superadmin', email: { not: SUPERADMIN_EMAIL } },
        ],
      },
    });
  });

  it('should delete a corrupt existing record and recreate the admin', async () => {
    const corrupt: MockUser = {
      id: Number.NaN,
      email: SUPERADMIN_EMAIL,
      name: 'Corrupt',
      passwordHash: 'hash',
      role: 'superadmin',
      status: 'active',
    };
    await runBootstrap(corrupt);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { email: SUPERADMIN_EMAIL },
    });
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('should only bootstrap once per module instance', async () => {
    const existing: MockUser = {
      id: 7,
      email: SUPERADMIN_EMAIL,
      name: 'Old',
      passwordHash: 'old-hash',
      role: 'user',
      status: 'pending',
    };
    const fresh = await runBootstrap(existing);
    const callsAfterFirst = mockPrisma.user.findUnique.mock.calls.length;

    await fresh.ensureConfiguredSuperadmin();
    await fresh.ensureConfiguredSuperadmin();

    expect(mockPrisma.user.findUnique.mock.calls.length).toBe(callsAfterFirst);
  });
});
