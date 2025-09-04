import type { NextRequest } from 'next/server';

export function getBaseUrl(req?: NextRequest): string {
  try {
    if (req) {
      // Prefer the request origin when available
      // @ts-ignore - nextUrl exists in NextRequest
      const origin = (req as any).nextUrl?.origin || new URL((req as any).url).origin;
      if (origin) return origin;
    }
  } catch {}

  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.FLY_APP_NAME) return `https://${process.env.FLY_APP_NAME}.fly.dev`;
  return 'http://127.0.0.1:3000';
}
