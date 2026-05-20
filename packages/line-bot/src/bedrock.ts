import { env } from '@khun/shared';

interface BedrockMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string }[];
}

/**
 * Calls Bedrock Claude via the new Bearer-token API key path.
 * Uses the AWS Bedrock InvokeModel endpoint with an Anthropic Claude payload shape.
 */
export async function bedrockClaude(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const url = `https://bedrock-runtime.${env.bedrockRegion()}.amazonaws.com/model/${encodeURIComponent(
    env.bedrockModelId()
  )}/invoke`;

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [
      { role: 'user', content: [{ type: 'text', text: opts.userMessage }] },
    ] satisfies BedrockMessage[],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.awsBearerTokenBedrock()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Bedrock invoke failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text: string }[] };
  return data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}
