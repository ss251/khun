import { env } from '@khun/shared';

export type ClaudeProvider = 'anthropic' | 'bedrock';

export interface ClaudeOptions {
  system: string;
  userMessage: string;
  maxTokens?: number;
  /** Override auto-selection. Default: anthropic if ANTHROPIC_API_KEY set, else bedrock. */
  provider?: ClaudeProvider;
}

function chooseProvider(): ClaudeProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.AWS_BEARER_TOKEN_BEDROCK) return 'bedrock';
  throw new Error(
    'No Claude provider configured. Set ANTHROPIC_API_KEY or AWS_BEARER_TOKEN_BEDROCK.'
  );
}

interface ContentBlock {
  type: string;
  text?: string;
}

interface MessagesResponse {
  content: ContentBlock[];
}

function extractText(data: MessagesResponse): string {
  return data.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!)
    .join('');
}

export async function claude(opts: ClaudeOptions): Promise<string> {
  const provider = opts.provider ?? chooseProvider();
  return provider === 'anthropic' ? invokeAnthropic(opts) : invokeBedrock(opts);
}

async function invokeAnthropic({
  system,
  userMessage,
  maxTokens = 1024,
}: ClaudeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL_ID ?? 'claude-opus-4-7';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: userMessage }] }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic invoke failed: ${res.status} ${await res.text()}`);
  }
  return extractText((await res.json()) as MessagesResponse);
}

async function invokeBedrock({
  system,
  userMessage,
  maxTokens = 1024,
}: ClaudeOptions): Promise<string> {
  const url = `https://bedrock-runtime.${env.bedrockRegion()}.amazonaws.com/model/${encodeURIComponent(
    env.bedrockModelId()
  )}/invoke`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.awsBearerTokenBedrock()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: userMessage }] }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Bedrock invoke failed: ${res.status} ${await res.text()}`);
  }
  return extractText((await res.json()) as MessagesResponse);
}
