const { createClient } = require("redis");
require("dotenv").config();

function toBool(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase() === "true"
  );
}

// Build options from env or provided snippet defaults
function buildClientOptions() {
  // Highest priority: REDIS_URL if provided
  let url = process.env.REDIS_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      const tlsFromEnv = toBool(process.env.REDIS_TLS);
      const needsTls = parsed.protocol === "rediss:" || tlsFromEnv;

      if (!parsed.port && process.env.REDIS_PORT) {
        parsed.port = String(process.env.REDIS_PORT);
        url = parsed.toString();
      }

      console.log(
        `Redis config: url provided (host=${parsed.hostname}, port=${parsed.port || "default"}, tls=${needsTls})`,
      );

      if (needsTls) {
        return {
          url,
          socket: {
            tls: false,
            servername: parsed.hostname,
            rejectUnauthorized: false,
          },
        };
      }

      return { url };
    } catch {
      console.warn(
        "Redis config: REDIS_URL is set but could not be parsed; falling back to raw url",
      );
      return { url };
    }
  }

  // Else assemble from discrete parts (username/password/host/port)
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT || 6379);
  const tls = toBool(process.env.REDIS_TLS);

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
    client.on("error", (err) => console.error("Redis Client Error", err));
  }
  if (!client.isOpen && !connectPromise) {
    connectPromise = client.connect().catch((err) => {
      console.error("Redis connect failed:", err);
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
    console.warn("Redis GET failed for key", key, e.message);
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
    console.warn("Redis SET failed for key", key, e.message);
    return false;
  }
}

module.exports = { cacheGet, cacheSet };
