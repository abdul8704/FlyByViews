const connectDB = require('./src/config/database');
const { notFoundHandler, errorHandler } = require('./src/middlewares/error.middleware');
const { requestLogger } = require('./src/middlewares/requestLogger.middleware');
const authRoutes = require('./src/routes/auth.routes');
const express = require('express');
const app = express();
const flightsRoutes = require('./src/routes/flights.routes');
require('dotenv').config();

// Middlewares
app.use(express.json());
app.use(requestLogger);

app.use("/auth", authRoutes);
app.use('/api/flights', flightsRoutes);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

const start = async () => {
    try {
        const PORT = process.env.PORT || 5000;
        await connectDB(process.env.MONGO_URI);
        console.log(`Connected to MongoDB✅`);

        app.listen(PORT, () => {
            console.log(`Server running at ${PORT}🔥`);
        });

    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
};

start();


