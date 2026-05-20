/**
 * Public base URL for our webhook + per-agent endpoints. Set via env so we
 * can swap between local cloudflared tunnels and the production Lambda URL
 * without code changes.
 */
export function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_BASE_URL ??
    process.env.KHUN_PUBLIC_BASE_URL ??
    'http://localhost:3000'
  );
}
