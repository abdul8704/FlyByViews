const { notFoundHandler, errorHandler } = require('./src/middlewares/error.middleware');
const { requestLogger } = require('./src/middlewares/requestLogger.middleware');
const express = require('express');
require('dotenv').config();
const app = express();
// Routes
const flightsRoutes = require('./src/routes/flights.routes');

// Middlewares
app.use(express.json());
app.use(requestLogger);



app.use('/api/flights', flightsRoutes);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


