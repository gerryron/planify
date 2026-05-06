import 'dotenv/config';
import { loginCliUser } from './src/cli/services/authCliService';
import { saveCliSession, getCliSessionFilePath } from './src/cli/lib/sessionStore';
import fs from 'node:fs';

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  
  if (!email || !password) {
    console.error('Credentials missing');
    process.exit(1);
  }

  const session = await loginCliUser({ email, password });
  await saveCliSession(session);
  
  const filePath = getCliSessionFilePath();
  const exists = fs.existsSync(filePath);
  console.log(`File exists: ${exists}`);
  if (exists) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Top-level keys: ${Object.keys(content).join(', ')}`);
  }
}

main().catch(console.error);
