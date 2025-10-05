const { createClient } = require('redis');
require('dotenv').config();

// Build options from env or provided snippet defaults
function buildClientOptions() {
  // Highest priority: REDIS_URL if provided
  const url = process.env.REDIS_URL;
  console.log('Redis URL from env:', url);
  if (url) {
    // If URL uses rediss (TLS), ensure socket.tls is enabled as well
    const needsTls = url.startsWith('rediss://');
    if (needsTls) {
      try {
        const parsed = new URL(url);
        return {
          url,
          socket: {
            tls: true,
            // Some providers prefer SNI servername to match certificate CN
            servername: parsed.hostname,
          },
        };
      } catch {
        return { url, socket: { tls: true } };
      }
    }
    return { url };
  }

  // Else assemble from discrete parts (username/password/host/port)
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT || 6379);
  const tls = String(process.env.REDIS_TLS || '').toLowerCase() === 'true';

  // Note: Add socket: { tls: true } if your provider requires TLS.
  return {
    username,
    password,
    socket: {
      host,
      port,
      ...(tls ? { tls: true } : {}),
    },
  };
}

let client;
let connectPromise = null;

function getClient() {
  if (!client) {
    const options = buildClientOptions();
    client = createClient(options);
    client.on('error', (err) => console.error('Redis Client Error', err));
  }
  if (!client.isOpen && !connectPromise) {
    connectPromise = client.connect().catch((err) => {
      console.error('Redis connect failed:', err);
      connectPromise = null;
      throw err;
    });
  }
  return client;
}

async function cacheGet(key) {
  const c = getClient();
  if (!c.isOpen && connectPromise) await connectPromise;
  try {
    return await c.get(key);
  } catch (e) {
    console.warn('Redis GET failed for key', key, e.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds) {
  const c = getClient();
  if (!c.isOpen && connectPromise) await connectPromise;
  try {
    if (ttlSeconds && Number.isFinite(ttlSeconds)) {
      await c.set(key, value, { EX: ttlSeconds });
    } else {
      await c.set(key, value);
    }
    return true;
  } catch (e) {
    console.warn('Redis SET failed for key', key, e.message);
    return false;
  }
}

module.exports = { cacheGet, cacheSet };
