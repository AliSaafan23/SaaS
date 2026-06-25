import { createClient } from 'redis';

const redisClient = createClient();

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.connect();
console.log("🔥 Redis Client Initialized!");
export default redisClient;