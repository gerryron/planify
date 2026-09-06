import { hashPassword, verifyPassword } from './password';

describe('password helpers', () => {
  it('should hash a password into a non-plaintext string', async () => {
    const hash = await hashPassword('my-secret-password');
    expect(hash).not.toBe('my-secret-password');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('should produce different hashes for the same password (salt)', async () => {
    const first = await hashPassword('same-password');
    const second = await hashPassword('same-password');
    expect(first).not.toBe(second);
  });

  it('should verify a correct password', async () => {
    const hash = await hashPassword('correct-horse');
    await expect(verifyPassword('correct-horse', hash)).resolves.toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await hashPassword('correct-horse');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
