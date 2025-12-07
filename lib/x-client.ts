import { Client, type ClientConfig } from '@xdevplatform/xdk';

// Initialize X API client with bearer token authentication
export function getXClient(): Client {
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error('X_BEARER_TOKEN is not configured in environment variables');
  }

  const config: ClientConfig = {
    bearerToken,
  };

  return new Client(config);
}
