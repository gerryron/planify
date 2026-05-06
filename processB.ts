import { loadCliSession, getCliSessionFilePath } from './src/cli/lib/sessionStore.ts';
import { validateCliSession } from './src/cli/services/authCliService.ts';
import fs from 'node:fs/promises';

async function run() {
  const p = getCliSessionFilePath();
  console.log('SESSION_PATH_CHECK:', p);
  
  // Step 3: Outside check (executed within same run here)
  try {
    const raw = await fs.readFile(p, 'utf8');
    console.log('RAW_FILE_EXISTS: true');
    console.log('FILE_CONTENT_REDACTED:', raw.replace(/\"token\":\s*\".*\"/g, '\"token\": \"[REDACTED]\"'));
  } catch (e) {
    console.log('RAW_FILE_EXISTS: false', e.code);
  }

  // Step 4: Process B: call loadCliSession
  const session = await loadCliSession();
  if (session) {
    const redactedSession = { ...session, token: '[REDACTED]' };
    console.log('LOADED_SESSION:', JSON.stringify(redactedSession, null, 2));

    // Step 5: call validateCliSession
    try {
      const validatedUser = await validateCliSession(session);
      const redactedUser = { ...validatedUser, token: '[REDACTED]' };
      console.log('VALIDATED_USER:', JSON.stringify(redactedUser, null, 2));
    } catch (e) {
      console.log('VALIDATION_FAILED:', e.message);
    }
  } else {
    console.log('loadCliSession returned null');
  }
}

run();
