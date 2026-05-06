import { loginCliUser, validateCliSession } from './src/cli/services/authCliService.ts';
import { saveCliSession, loadCliSession, getCliSessionFilePath } from './src/cli/lib/sessionStore.ts';
import fs from 'node:fs/promises';

async function run() {
  console.log('--- START ---');
  const p = getCliSessionFilePath();
  console.log('SESSION_PATH:', p);

  // Step 1: Remove
  try { await fs.unlink(p); console.log('Deleted existing'); } catch (e) {}

  // Step 2: Login and Save
  const session = await loginCliUser({ email: 'superadmin@planify.local', password: 'abogoboga2026' });
  await saveCliSession(session);
  console.log('SAVED_SESSION_REDACTED:', JSON.stringify({...session, token: '[REDACTED]'}, null, 2));

  // Step 3: Verify File
  const raw = await fs.readFile(p, 'utf8');
  console.log('FILE_CONTENT_REDACTED:', raw.replace(/\"token\":\s*\".*\"/g, '\"token\": \"[REDACTED]\"'));

  // Step 4: Load
  const loaded = await loadCliSession();
  if (loaded) {
    console.log('LOADED_SESSION_REDACTED:', JSON.stringify({...loaded, token: '[REDACTED]'}, null, 2));
    
    // Step 5: Validate
    const validated = await validateCliSession(loaded);
    console.log('VALIDATED_USER_REDACTED:', JSON.stringify({...validated, token: '[REDACTED]'}, null, 2));
  } else {
    console.log('Load failed');
  }
}

run().catch(console.error);
