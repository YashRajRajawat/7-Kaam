# 7-Kaam: AI-Powered Skill Certification Platform

> Transform skill verification with intelligent testing and real-time analytics

## 📋 Project Overview

**7-Kaam** is a comprehensive AI-powered skill certification platform designed to streamline worker skill assessments, testing, and management. It combines modern web technologies with intelligent evaluation systems to provide accurate, unbiased skill verification.

### Key Features

- 🤖 **AI-Powered Evaluation** - Groq-based intelligent scoring system
- 🧪 **Dynamic Testing** - Customizable tests with QR code verification
- 📊 **Real-time Analytics** - Comprehensive dashboards and reporting
- 👥 **Multi-role System** - Support for workers, admins, and evaluators
- 🔐 **Secure Authentication** - JWT-based with role-based access control
- 🌍 **Geolocation Tracking** - Location-based verification
- 📱 **Multi-platform** - Web dashboard + Flutter mobile apps
- ⚡ **High Performance** - Redis caching, BullMQ job processing

---

## 🏗️ Project Structure

```
7-Kaam/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── controllers/       # Business logic
│   │   ├── services/          # External services (AI, Geo, etc.)
│   │   ├── middleware/        # Auth, validation, error handling
│   │   └── utils/             # Utilities (hash, constants)
│   ├── prisma/                # Database schema & migrations
│   ├── tests/                 # Test files
│   └── package.json
│
├── dashboard/                  # Next.js 14 Frontend
│   ├── app/
│   │   ├── (auth)/            # Auth pages
│   │   ├── workers/           # Worker routes
│   │   ├── tests/             # Test management
│   │   └── page.tsx           # Dashboard home
│   ├── lib/                   # Utilities & API client
│   ├── components/            # Reusable components
│   └── package.json
│
├── mobile/                     # Flutter Mobile Apps
│   ├── flutter_sample_1/      # Sample Flutter app
│   └── customer_app/          # Customer-facing app
│
├── .gitignore
├── .env.example               # Backend env template
└── README.md
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **ORM**: Prisma 7.x
- **Database**: PostgreSQL (via Supabase)
- **Cache**: Redis (ioredis)
- **Job Queue**: BullMQ
- **Authentication**: JWT (jsonwebtoken)
- **AI Service**: Groq API
- **File Processing**: PDF-lib, Multer
- **Validation**: Zod
- **Security**: Helmet, bcryptjs, express-rate-limit

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Radix UI
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form
- **Validation**: Zod
- **Charts**: Recharts

### Mobile
- **Framework**: Flutter
- **Target Platforms**: iOS, Android, Web

---

## 📋 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** 18+ (https://nodejs.org/)
- **npm** 9+ or **yarn** 1.22+
- **Git** (https://git-scm.com/)
- **Flutter** 3.10+ (for mobile development) (https://flutter.dev/)
- **PostgreSQL** (or Supabase account) (https://supabase.com/)

### Required Accounts
- **Supabase** account for PostgreSQL database
- **Groq API** key (https://console.groq.com/)
- **Redis** instance (local or cloud)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/7-Kaam.git
cd 7-Kaam
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your actual credentials
nano .env.local

# Setup database
npm run db:generate
npm run db:push

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

The backend will run on http://localhost:5000

### 3. Dashboard Setup

```bash
cd ../dashboard

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local - update NEXT_PUBLIC_API_URL if backend runs on different port
nano .env.local

# Start development server
npm run dev
```

The dashboard will run on http://localhost:3000

### 4. Mobile App Setup (Optional)

```bash
cd ../mobile/customer_app

# Get Flutter dependencies
flutter pub get

# Run on emulator/device
flutter run
```

---

## 📝 Environment Configuration

### Backend (.env.local)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/7kaam_db"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRY="7d"

# Redis
REDIS_URL="redis://localhost:6379"

# Groq API
GROQ_API_KEY="your-groq-key"
GROQ_MODEL="mixtral-8x7b-32768"

# Frontend URL for CORS
FRONTEND_URL="http://localhost:3000"

# Node Environment
NODE_ENV="development"
PORT=5000
```

See backend/.env.example for all available options.

### Dashboard (.env.local)

```env
# Backend API
NEXT_PUBLIC_API_URL="http://localhost:5000/api"

# Environment
NODE_ENV="development"
```

See dashboard/.env.example for all available options.

---

## 🗄️ Database Setup

### Using Supabase

1. Create a Supabase project (https://supabase.com/)
2. Copy the connection string from project settings
3. Add to your .env.local: DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

### Initialize Database

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed with initial data
npm run db:seed
```

---

## 🏃 Running the Application

### Development Mode (All Services)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Dashboard:**
```bash
cd dashboard
npm run dev
```

**Terminal 3 - Mobile (optional):**
```bash
cd mobile/customer_app
flutter run
```

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Dashboard:**
```bash
cd dashboard
npm run build
npm start
```

---

## 🔗 API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- POST /api/auth/verify - Verify token

### Workers
- GET /api/workers - List all workers
- GET /api/workers/:id - Get worker details
- PUT /api/workers/:id - Update worker
- DELETE /api/workers/:id - Delete worker

### Tests
- GET /api/tests - List tests
- POST /api/tests - Create test
- GET /api/tests/:id - Get test details
- PUT /api/tests/:id - Update test
- DELETE /api/tests/:id - Delete test

### Reports & Analytics
- GET /api/reports - Get test reports
- GET /api/analytics/dashboard - Dashboard analytics

### QR Verification
- GET /api/public/qr/:code - Verify QR code

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm run test

# Run specific test file
npm test tests/auth.test.js
```

### Dashboard Tests

```bash
cd dashboard

# Run ESLint
npm run lint
```

---

## 🚢 Deployment

### Option 1: Vercel + Railway (Recommended)

**Dashboard (Vercel):**
1. Push code to GitHub
2. Connect repo to Vercel
3. Set root directory to dashboard/
4. Add environment variables
5. Deploy

**Backend (Railway):**
1. Connect GitHub repo to Railway
2. Set root directory to backend/
3. Add all environment variables from .env.example
4. Deploy
5. Copy deployed API URL to dashboard's NEXT_PUBLIC_API_URL

### Option 2: Self-Hosted (VPS)

See DEPLOYMENT.md for detailed instructions.

---

## 🔒 Security Considerations

- ✅ Environment variables never committed to repo
- ✅ JWT tokens for authentication
- ✅ Helmet for HTTP headers
- ✅ CORS configuration
- ✅ Rate limiting enabled
- ✅ Input validation with Zod
- ✅ Password hashing with bcryptjs
- ✅ SQL injection prevention (Prisma ORM)

### Before Production:
- Change all default secrets
- Enable HTTPS
- Configure proper CORS origins
- Setup rate limiting appropriately
- Enable database backups
- Setup monitoring & logging

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit changes (git commit -m 'Add amazing feature')
4. Push to branch (git push origin feature/amazing-feature)
5. Open a Pull Request

### Code Style
- Use ESLint for JavaScript/TypeScript
- Follow Prettier formatting
- Write clear commit messages

---

## 📦 Dependencies

All dependencies are locked in package-lock.json. Key packages:

**Backend:**
- Express 5.x - Web framework
- Prisma 7.x - ORM
- Groq SDK - AI evaluation
- BullMQ - Job processing

**Frontend:**
- Next.js 14 - React framework
- TailwindCSS - Styling
- Radix UI - Components
- TanStack Query - Data fetching

Run npm outdated to check for updates.

---

## 🆘 Troubleshooting

### Backend won't connect to database
```bash
# Check DATABASE_URL in .env.local
# Verify PostgreSQL/Supabase is running
# Try: psql $DATABASE_URL
npm run db:push
```

### Dashboard API calls failing
```bash
# Verify backend is running on correct port
# Check NEXT_PUBLIC_API_URL in .env.local
# Check CORS configuration in backend
# Check browser console for errors
```

### Redis connection errors
```bash
# Verify Redis is running: redis-cli ping
# Check REDIS_URL in .env.local
# For local: REDIS_URL="redis://localhost:6379"
```

### Port already in use
```bash
# Backend (change port in .env.local):
PORT=5001

# Dashboard (Vercel auto-handles, or):
npm run dev -- -p 3001
```

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 👥 Support

For support, questions, or bug reports:
- Open an issue on GitHub
- Contact: your-email@example.com
- Documentation: Project Wiki

---

## 🎯 Roadmap

- [ ] Mobile app optimization
- [ ] Advanced analytics dashboard
- [ ] Blockchain certificate integration
- [ ] Multi-language support
- [ ] Video proctoring integration
- [ ] Advanced AI models support

---

**Happy coding! 🚀**

*Last updated: 2026-08-19*
