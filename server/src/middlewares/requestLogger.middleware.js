const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  const { method, originalUrl } = req;
  logger.info(`Incoming ${method} ${originalUrl}`, { ip: req.ip });

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    logger.info(`Completed ${method} ${originalUrl} ${res.statusCode} in ${ms.toFixed(1)}ms`);
  });

  res.on('close', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    logger.warn(`Closed ${method} ${originalUrl} ${res.statusCode} after ${ms.toFixed(1)}ms`);
  });

  next();
};

module.exports = { requestLogger };


