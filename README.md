# FlyByViews 🛫

**FlyByViews** is an intelligent flight route planner that helps travelers discover scenic views and choose optimal airplane seats for sunrise/sunset viewing. The application analyzes geographical features along flight paths and calculates sun positions to provide personalized seat recommendations.

![Flight Route Planning](https://img.shields.io/badge/Status-Active-green)

## ✨ Features

### 🗺️ Interactive Route Planning
- Plan flight routes between any two cities worldwide
- Interactive map visualization with Leaflet and OpenStreetMap
- Real-time great-circle path calculation

### 🏔️ Scenic Feature Discovery
- Discover mountains, volcanoes, and coastlines along your flight path
- Left/right side classification of scenic features
- Detailed scenery statistics and breakdown

### 🌅 Smart Seat Recommendations
- **Sun Position Analysis**: Real-time solar calculations for optimal sunrise/sunset viewing
- **Time-based Recommendations**: Suggests left or right window seats based on flight time
- **Interactive Sun Tracking**: Time slider to visualize sun position throughout the flight
- **Night Flight Detection**: Intelligent handling of nighttime flights

### 📊 Flight Analytics
- Distance calculations and flight duration estimates
- Scenic feature counts by type (mountains, coastlines, volcanoes)
- Subsolar point tracking (where sun is directly overhead)


## 🛠️ Tech Stack

### Frontend
- **React 17** - User interface framework
- **Leaflet & React-Leaflet** - Interactive maps
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database 
- **Mongoose** - MongoDB object modeling
- **Redis** - Caching recent queries
- **Nodemailer** - Email service for OTP

### External APIs & Data Sources
- **OpenStreetMap Nominatim** - City coordinates geocoding
- **Overpass API** - Geographical feature data
- **Custom astronomical calculations** - Sun position algorithms

## 🚀 Local Setup

### Prerequisites
- **Node.js** (v16+ recommended)
- **MongoDB** (local installation or MongoDB Atlas)
- **Redis** (for caching)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/abdul8704/FlightBooking-clean.git
cd FlightBooking-clean
```

### 2. Backend Setup

#### Navigate to server directory
```bash
cd server
```

#### Install dependencies
```bash
npm install
```

#### Environment Configuration
Create a `.env` file in the `server` directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/flybyviews
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flybyviews

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# Email Configuration (for OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# API Configuration
USER_EMAIL=your-email@domain.com  # Used for OpenStreetMap API requests
PORT=5000
```


#### Start the backend server
```bash
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Setup

#### Navigate to client directory (new terminal)
```bash
cd client
```

#### Install dependencies
```bash
npm install
```

#### Start the development server
```bash
npm run dev
# Client runs on http://localhost:5173
```

### 4. Access the Application
Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📱 How to Use

### 1. Plan a Flight Route
1. Navigate to the **Flight Route Planner** page
2. Enter your **source city** (e.g., "Chennai")
3. Enter your **destination city** (e.g., "Srinagar")
4. Optionally add a **departure time** for sun calculations
5. Click **"Plan Route & Show Scenery"**

### 2. Explore Scenic Features
- View the interactive map showing your flight path
- Examine **scenic statistics** showing mountains, coastlines, and volcanoes on left/right sides
- Click on map markers to see feature details

### 3. Get Seat Recommendations
- If you provided a departure time, see **smart seat recommendations**
- Use the **time slider** to track sun position throughout your flight
- Choose between sunrise/sunset viewing or scenic features

### 4. Interactive Sun Tracking
- The **yellow dot** shows where the sun is directly overhead
- **Drag the slider** to see sun movement during your flight
- Get real-time guidance on which side to look for the sun

## 🔧 API Endpoints

### Flight Routes
- `POST /api/flights/route-scenery` - Get scenic features along a flight route

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/send-otp` - Send OTP for password reset
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/reset-password` - Reset password

## 🌟 Key Algorithms

### Sun Position Calculation
The application uses precise astronomical algorithms to calculate:
- **Solar azimuth** and **altitude** at any time and location
- **Subsolar point** (where sun is directly overhead)
- **Relative bearing** from aircraft heading to sun position

### Great Circle Path
- Implements **great circle interpolation** for accurate flight paths
- Accounts for Earth's curvature in route calculations
- Provides smooth geodesic visualization

### Side Classification
- Determines if scenic features are visible on **left** or **right** side of aircraft
- Uses cross-product mathematics for precise spatial classification

## 📂 Project Structure

```
FlightBooking-clean/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Main application pages
│   │   ├── utils/            # Helper functions & calculations
│   │   └── api/              # API configuration
│   └── package.json
├── server/                   # Node.js backend
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # Database schemas
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Helper utilities
│   │   └── config/           # Database & app configuration
│   └── package.json
└── instructions/             # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- **OpenStreetMap** community for geographical data
- **Leaflet** for excellent mapping library
- **Overpass API** for efficient geographical queries
- **Nominatim** for city geocoding services

---

**Built with ❤️ for travelers who love scenic flights** ✈️🌅
