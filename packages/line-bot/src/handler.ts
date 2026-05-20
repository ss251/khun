import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { verifySignature } from './line.js';
import { handleMessageEvent } from './route.js';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const body = event.body ?? '';
  const signature = event.headers['x-line-signature'] ?? '';

  if (!verifySignature(body, signature)) {
    return { statusCode: 401, body: 'invalid signature' };
  }

  const payload = JSON.parse(body);
  await Promise.all(
    (payload.events ?? []).map((e: any) => handleMessageEvent(e).catch(console.error))
  );

  return { statusCode: 200, body: 'ok' };
};
