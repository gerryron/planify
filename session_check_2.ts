import { loadCliSession } from './src/cli/lib/sessionStore';
import { validateCliSession } from './src/cli/services/authCliService';

async function main() {
  const session = await loadCliSession();
  if (!session) {
    console.log('Session not found');
    return;
  }
  const validationResult = await validateCliSession(session);
  const { token, ...rest } = validationResult as any;
  console.log('Validation result fields:', Object.keys(validationResult));
  console.log('Validation result (without token):', JSON.stringify(rest, null, 2));
}

main().catch(console.error);
