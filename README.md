# CivicLens - Civic Complaint Management System

> **A geo-based civic grievance management platform** for local government operations with AI-powered classification, WhatsApp bot integration, and real-time tracking.

---

## 🚀 Live Deployments

- **Backend API**: [https://civiclensbackend.abdulrahmanazam.me](https://civiclensbackend.abdulrahmanazam.me)
- **API Health**: [https://civiclensbackend.abdulrahmanazam.me/api/v1/health](https://civiclensbackend.abdulrahmanazam.me/api/v1/health)
- **Deployed link**: https://civiclensfast.vercel.app/

---

## 📱 WhatsApp Integration

**Submit complaints via WhatsApp:**
- **Number**: `03183610230` or `+92 318 3610230`
- Simply message this number to report civic issues
- Bot will guide you through the complaint submission process
- Supports text, voice notes, images, and location sharing

---

## 🎯 Key Features

### Citizen Features
- **Multiple Submission Channels**: Web app, mobile app, WhatsApp bot, voice complaints
- **Location-Based Reporting**: GPS-enabled geolocation or manual map pinning
- **Photo Evidence**: Upload up to 5 images per complaint
- **Voice Complaints**: Record and submit issues via voice (auto-transcribed)
- **Real-Time Tracking**: Track complaint status from submission to resolution
- **Feedback System**: Rate and review completed resolutions
- **SMS/Push Notifications**: Get notified at every status change

### AI-Powered Automation
- **Smart Classification**: Auto-categorize complaints using GROQ AI
- **Duplicate Detection**: Identify similar complaints within 500m radius
- **Severity Scoring**: Intelligent priority calculation (1-10 scale)
- **Speech-to-Text**: Convert voice complaints to text
- **Natural Language Processing**: Extract keywords and urgency indicators

### Administrative Features
- **UC-Based Routing**: Auto-assign complaints to Union Councils via GeoJSON boundaries
- **Officer Management**: Assign complaints to department officers
- **SLA Tracking**: Monitor resolution deadlines with auto-escalation
- **Chairman Verification**: Multi-level approval workflow
- **Escalation System**: Automatic escalation on SLA breach or repeated reopens
- **Role-Based Access**: Citizen, Officer, UC Chairman, Town Chairman, Admin, NGO

### Analytics & Reporting
- **Real-Time Dashboards**: Category, status, and area-wise statistics
- **Heatmap Visualization**: Complaint density maps with Leaflet.js
- **Performance Metrics**: Resolution rates, SLA compliance, officer performance
- **Trend Analysis**: Weekly/monthly complaint patterns
- **Export Reports**: Generate reports for governance and transparency

### WhatsApp Bot Capabilities
- **Conversational Interface**: Natural language complaint submission
- **Step-by-Step Guidance**: Interactive flows for data collection
- **Status Inquiries**: Check complaint status via message
- **Media Support**: Send photos and voice notes
- **Location Sharing**: Share location directly or via web link

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js v5
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens, OTP-based auth
- **Image Storage**: Cloudinary
- **AI/ML**: GROQ AI (classification), TF-IDF (fallback)
- **WhatsApp**: Baileys (WhatsApp Web API)
- **Speech Recognition**: Whisper.cpp (offline)
- **Email**: Nodemailer + Brevo SMTP
- **Logging**: Pino
- **Validation**: express-validator
- **File Upload**: Multer
- **Geospatial**: MongoDB GeoJSON queries
- **Cron Jobs**: node-cron (SLA monitoring, escalations)

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router v7
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Maps**: Leaflet, React Leaflet, Leaflet.heat
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Clustering**: React Leaflet Cluster

### Blockchain (Optional)
- **Framework**: Hardhat
- **Library**: Ethers.js v6
- **Network**: Sepolia Testnet
- **Contract**: ComplaintTracker (immutable audit trail)

---

## 📦 Installation & Setup

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or Atlas)
- Git

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials (MongoDB, Cloudinary, GROQ API, etc.)

# Start development server
npm run dev

# Or start production server
npm start

# Run WhatsApp bot (separate process)
npm run whatsapp

# Run API tests
npm run test:apis
```

**Backend runs on**: `http://localhost:3000`

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with backend API URL

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Frontend runs on**: `http://localhost:5173`

---

## 🔑 Default Credentials

> **Note**: For testing purposes only. Change in production.

### Admin Account
- **Phone**: `+923001234567`
- **Role**: Admin
- **Access**: Full system access

### UC Chairman
- **Phone**: Contact admin for creation
- **Role**: UC Chairman
- **Access**: UC-level management

### Officer
- **Phone**: Contact UC Chairman for creation
- **Role**: Department Officer
- **Access**: Assigned complaints only

### Citizen
- **Registration**: Self-registration via phone OTP
- **Access**: Own complaints only

---

## 📚 Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/civiclens

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# GROQ AI (Free tier available at console.groq.com)
GROQ_API_KEY=your_groq_api_key
AI_CLASSIFICATION_ENABLED=true

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# WhatsApp
WHATSAPP_ENABLED=true
WHATSAPP_AUTH_DIR=./whatsapp-auth

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend URL
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=*
```

### Frontend (.env)

```env
# Backend API
VITE_API_URL=http://localhost:3000/api/v1

# Blockchain (Optional)
VITE_CONTRACT_ADDRESS=
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

---

## 🚦 Running the Application

### Development Mode

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev

# Terminal 3 (Optional): Start WhatsApp Bot
cd backend
npm run whatsapp
```

### Production Mode

```bash
# Build Frontend
cd frontend
npm run build

# Serve with Backend
cd backend
NODE_ENV=production npm start
```

---

## 📖 API Documentation

- **Base URL**: `http://localhost:3000/api/v1`
- **Health Check**: `GET /health`
- **API Docs**: See [backend/API_ENDPOINTS.md](backend/API_ENDPOINTS.md)

### Quick Examples

```bash
# Health Check
curl http://localhost:3000/api/v1/health

# Submit Complaint
curl -X POST http://localhost:3000/api/v1/complaints \
  -F "description=Pothole on main road" \
  -F "phone=+923001234567" \
  -F "latitude=24.8607" \
  -F "longitude=67.0011" \
  -F "images=@photo.jpg"

# Get Complaints
curl "http://localhost:3000/api/v1/complaints?page=1&limit=10&category=Roads"
```

---

## 📱 WhatsApp Bot Usage

1. **Save the number**: `03183610230`
2. **Send "Hi"** to start conversation
3. **Follow prompts**:
   - Describe your complaint
   - Share location (GPS or map link)
   - Optionally send photos
4. **Confirm** submission
5. **Track** status by replying with complaint ID

---

## 🗺️ Project Structure

```
civiclens/
├── backend/               # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Database, env config
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── middlewares/  # Auth, validation
│   │   ├── utils/        # Helper functions
│   │   └── whatsappBot.js # WhatsApp integration
│   ├── scripts/          # Seed data, migrations
│   ├── package.json
│   └── README.md
│
├── frontend/             # React + Vite SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Route pages
│   │   ├── services/     # API clients
│   │   ├── stores/       # Zustand stores
│   │   ├── hooks/        # Custom hooks
│   │   └── styles/       # Tailwind CSS
│   ├── public/           # Static assets
│   ├── package.json
│   └── README.md
│
├── blockchain/           # Smart contracts (optional)
│   ├── contracts/        # Solidity contracts
│   ├── scripts/          # Deployment scripts
│   └── hardhat.config.js
│
└── README.md             # This file
```

---

## 🧪 Testing

```bash
# Backend Tests
cd backend
npm test

# API Smoke Tests
npm run test:apis

# Frontend Tests
cd frontend
npm run test
```

---

## 📋 Available Scripts

### Backend
- `npm start` - Start production server
- `npm run dev` - Start dev server with hot reload
- `npm run whatsapp` - Run WhatsApp bot
- `npm run test:apis` - Run API smoke tests
- `npm test` - Run unit tests

### Frontend
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

---

## 🌍 Deployment

### Backend
- Deploy to any Node.js hosting (Render, Railway, Heroku, AWS)
- Set environment variables
- Ensure MongoDB connection
- Configure CORS for frontend domain

### Frontend
- Build: `npm run build`
- Deploy `dist/` folder to Vercel, Netlify, or Cloudflare Pages
- Set `VITE_API_URL` to production backend URL

---

## 🔐 Security Features

- JWT-based authentication
- OTP verification for phone numbers
- Role-based access control (RBAC)
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- MongoDB injection prevention
- Private data masking (phone, email)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

ISC License - See LICENSE file for details

---

## 📞 Support & Contact

- **WhatsApp**: 03183610230 (for complaints)
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: See `/backend/API_ENDPOINTS.md` for full API reference

---

## 🙏 Acknowledgments

- GROQ for free AI classification API
- Baileys for WhatsApp Web integration
- OpenStreetMap for map tiles
- Cloudinary for image hosting
- MongoDB Atlas for database hosting

---

**Made with ❤️ for better civic governance**

