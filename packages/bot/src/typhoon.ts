import OpenAI from 'openai';
import { env } from '@khun/shared';

const client = (): OpenAI =>
  new OpenAI({ apiKey: env.typhoonApiKey(), baseURL: env.typhoonBaseUrl() });

export async function parseThaiIntent(thaiMessage: string): Promise<string> {
  const r = await client().chat.completions.create({
    model: env.typhoonModelId(),
    messages: [
      {
        role: 'system',
        content:
          'You are Khun, a Thai LINE bot that helps Thai service providers register as Solana AI agents. Given a Thai message from a service provider, extract JSON with keys: service_description_thai (preserve original), service_description_english (translation), price_thb (number or null), price_usdt (number or null — convert if THB given, assume 32.5 THB/USDT), category (food|transport|guide|service|other), hours (string or null), location (string or null), languages (array of language codes). Reply ONLY with valid JSON, no markdown.',
      },
      { role: 'user', content: thaiMessage },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });
  return r.choices[0]?.message?.content ?? '{}';
}
