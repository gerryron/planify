import { clearAuthCookie } from '@/core/auth/session';
import { ok } from '@/core/http/apiResponse';

export async function POST() {
  const res = ok({ success: true });
  clearAuthCookie(res);
  return res;
}
