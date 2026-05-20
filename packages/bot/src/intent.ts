import type { MerchantIntent } from '@khun/shared';
import { parseThaiIntent } from './typhoon.js';

interface RawIntent {
  service_description_thai?: unknown;
  service_description_english?: unknown;
  price_thb?: unknown;
  price_usdt?: unknown;
  category?: unknown;
  hours?: unknown;
  location?: unknown;
  languages?: unknown;
}

const VALID_CATEGORIES = new Set(['food', 'transport', 'guide', 'service', 'other']);
const DEFAULT_USDT_THB = 32.5; // fallback only; live rate comes from Bitkub ticker for display.

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/**
 * Turn a Thai message into a structured MerchantIntent.
 * Typhoon does the heavy parsing (it's the SCB 10X integration); we validate
 * and default the result here so downstream code can assume a clean shape.
 */
export async function extractIntent(thaiMessage: string): Promise<MerchantIntent> {
  const raw = await parseThaiIntent(thaiMessage);

  let parsed: RawIntent;
  try {
    parsed = JSON.parse(raw) as RawIntent;
  } catch {
    throw new Error(`Typhoon returned invalid JSON: ${raw.slice(0, 300)}`);
  }

  const thai = toString(parsed.service_description_thai) ?? thaiMessage;
  const english = toString(parsed.service_description_english) ?? '';

  const priceThb = toNumber(parsed.price_thb);
  let priceUsdt = toNumber(parsed.price_usdt);
  if (priceUsdt === undefined && priceThb !== undefined) {
    priceUsdt = Math.round((priceThb / DEFAULT_USDT_THB) * 100) / 100;
  }
  if (priceUsdt === undefined) priceUsdt = 1; // safe default for demo

  const rawCategory = toString(parsed.category)?.toLowerCase() ?? 'other';
  const category = (VALID_CATEGORIES.has(rawCategory) ? rawCategory : 'other') as
    MerchantIntent['category'];

  const languages = Array.isArray(parsed.languages)
    ? (parsed.languages.filter((l) => typeof l === 'string') as string[])
    : undefined;

  return {
    serviceDescriptionThai: thai,
    serviceDescriptionEnglish: english,
    priceUsdt,
    priceThbReference: priceThb,
    category,
    hours: toString(parsed.hours),
    location: toString(parsed.location),
    languages,
  };
}
