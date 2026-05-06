import { loginCliUser } from './src/cli/services/authCliService.ts';
import { saveCliSession, getCliSessionFilePath } from './src/cli/lib/sessionStore.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';
import { prisma } from './src/core/db/prisma.ts';

dotenv.config();

function getLegacyCliSessionFilePath() {
  const home = os.homedir();
  return path.join(home, '.planify', 'session.json');
}

async function run() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  
  if (!email || !password) {
      console.error('Missing credentials');
      process.exit(1);
  }

  const result = await loginCliUser({ email, password });
  if (!result.success) {
    console.error('Login failed:', (result as any).error);
    process.exit(1);
  }

  const session = (result as any).session;
  await saveCliSession(session);
  
  const currentPath = getCliSessionFilePath();
  const legacyPath = getLegacyCliSessionFilePath();
  
  const currentExists = await fs.access(currentPath).then(() => true).catch(() => false);
  const legacyExists = await fs.access(legacyPath).then(() => true).catch(() => false);
  
  console.log('STEP1_RESULT:', JSON.stringify({ currentExists, legacyExists }));
}

run().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\());
