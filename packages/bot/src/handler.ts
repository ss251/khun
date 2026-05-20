import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { verifySecretToken } from './telegram.js';
import { handleUpdate } from './route.js';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const body = event.body ?? '';
  const headerToken = event.headers['x-telegram-bot-api-secret-token'];

  if (!verifySecretToken(headerToken)) {
    return { statusCode: 401, body: 'invalid secret token' };
  }

  let update: unknown;
  try {
    update = JSON.parse(body);
  } catch {
    return { statusCode: 400, body: 'invalid JSON' };
  }

  await handleUpdate(update).catch(console.error);
  return { statusCode: 200, body: 'ok' };
};
