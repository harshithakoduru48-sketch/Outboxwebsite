import Redis from 'ioredis';
import { config } from './index';

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
});

redisConnection.on('connect', () => {
  console.log(`[Redis] Connected to Redis at ${config.redis.host}:${config.redis.port}`);
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});
