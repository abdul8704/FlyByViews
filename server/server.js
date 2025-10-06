const connectDB = require('./src/config/database');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { notFoundHandler, errorHandler } = require('./src/middlewares/error.middleware');
const { requestLogger } = require('./src/middlewares/requestLogger.middleware');
const authRoutes = require('./src/routes/auth.routes');
const express = require('express');
const app = express();
const flightsRoutes = require('./src/routes/flights.routes');
require('dotenv').config();

const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:5174", "https://fly-by-views.vercel.app"],
    credentials: true, // Include cookies and auth headers if needed
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Middlewares
app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use('/api/flights', flightsRoutes);

// Health
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: "server is running" });
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


