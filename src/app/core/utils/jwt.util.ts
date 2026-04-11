/**
 * Lectura del claim `exp` del JWT (sin verificar firma; solo para UX en cliente).
 * Si el token no es un JWT de 3 segmentos o no trae `exp`, se considera "no expirado por fecha"
 * y la validez la decide el servidor.
 */
export function isJwtExpired(token: string, clockSkewSeconds = 60): boolean {
  const expUnix = getJwtExpiryUnix(token);
  if (expUnix === null) {
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= expUnix - clockSkewSeconds;
}

function getJwtExpiryUnix(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const json = base64UrlDecodeToString(parts[1]);
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function base64UrlDecodeToString(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  return atob(base64 + pad);
}
