import { loginCliUser, validateCliSession } from './src/cli/services/authCliService.ts';
import { saveCliSession, getCliSessionFilePath } from './src/cli/lib/sessionStore.ts';
import fs from 'node:fs/promises';

async function run() {
  try {
    const session = await loginCliUser({
      email: 'superadmin@planify.local',
      password: 'abogoboga2026',
    });
    
    await saveCliSession(session);
    
    const p = getCliSessionFilePath();
    console.log('SESSION_PATH:', p);
    
    // Redact token for printing
    const redactedSession = { ...session, token: '[REDACTED]' };
    console.log('SAVED_SESSION_JSON:', JSON.stringify(redactedSession, null, 2));
  } catch (e) {
    console.error('FAILED_A:', e);
    process.exit(1);
  }
}

run();
