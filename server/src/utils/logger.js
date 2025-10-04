const util = require('util');

const levelToLabel = {
  error: 'ERROR',
  warn: 'WARN',
  info: 'INFO',
  debug: 'DEBUG'
};

const format = (level, message, meta) => {
  const ts = new Date().toISOString();
  const label = levelToLabel[level] || level.toUpperCase();
  const base = `[${ts}] [${label}] ${message}`;
  if (!meta) return base;
  try {
    const serialized = typeof meta === 'string' ? meta : util.inspect(meta, { depth: 4, breakLength: 120, colors: false });
    return `${base} ${serialized}`;
  } catch {
    return base;
  }
};

const logger = {
  error: (msg, meta) => console.error(format('error', msg, meta)),
  warn: (msg, meta) => console.warn(format('warn', msg, meta)),
  info: (msg, meta) => console.log(format('info', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') console.log(format('debug', msg, meta));
  }
};

module.exports = logger;


