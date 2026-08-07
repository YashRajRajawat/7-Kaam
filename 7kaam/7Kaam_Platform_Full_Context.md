# 7 Kaam Platform — Complete Developer & Architecture Documentation

**7 Kaam** is India's blue-collar skill certification and direct contact platform. It enables skilled trade workers (electricians, plumbers, carpenters, AC technicians, painters, welders) to get certified through a 3-signal assessment pipeline and connect directly with nearby customers without booking commission fees or middleman friction.

---

## 📌 1. Core Architecture & Product Rules

1. **Direct Customer-to-Worker Contact (No Booking Middleman)**:
   - Customers search, filter, and inspect verified worker scores.
   - Primary contact actions are direct phone call (`tel:+91...`) and direct WhatsApp messaging.
2. **3-Signal Assessment Pipeline (0 - 100 Score)**:
   - **Video Assessment Score**: Evaluation of 60-second practical skill video (AI vision model / Admin manual score `0–100`).
   - **Trade Test Score**: Practical trade tests & MCQs.
   - **Work History Score**: Verified employer and contractor entries.
3. **KaamCard Verification & Admin Review**:
   - Registered workers are listed immediately with their test/video score.
   - Admins review skill videos on the Admin Web Dashboard via an HTML5 video player, assign manual video scores, and issue official digital **KaamCards** with tamper-proof QR tokens.
   - Admins can suspend workers or revoke KaamCards if complaints arise.

---

## 📁 2. Repository & Codebase Directory Map

`c:\Codes\7-Kaam\7kaam\`

```
├── backend/                           # Node.js Express REST API (Supabase / PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema (Worker, Customer, Admin, KaamCard, TradeTest, WorkHistory)
│   │   └── seed_supabase.js           # Supabase Cloud Database Seed Script (13 Trade Tests + Admin)
│   ├── src/
│   │   ├── app.js                     # Express app setup, CORS, JSON parsers, route mounts
│   │   ├── server.js                  # Entry point (port 8000)
│   │   ├── controllers/               # Business logic (authController, scoringController, workerController)
│   │   ├── middleware/                # JWT Auth middleware (auth.js)
│   │   ├── routes/                    # API Route Handlers
│   │   │   ├── auth.js                # Public Admin, Worker, Customer login endpoints
│   │   │   ├── mobile.js              # Nearby workers search, public profile, customer/worker registration
│   │   │   ├── workers.js             # Admin Worker Directory & Public Worker Register
│   │   │   ├── tests.js               # Trade test catalogue & submissions
│   │   │   ├── scoring.js             # Score video, compute final score, issue KaamCard
│   │   │   ├── kaamcards.js           # KaamCard retrieval & PDF generation
│   │   │   └── verify.js              # Public QR Token Verification
│   │   └── utils/                     # Prisma wrapper over Supabase client (prisma.js)
│   └── .env                           # Database URL, Supabase Service Key, JWT Secret, Port
│
├── dashboard/                         # Admin Web Dashboard (Next.js 14, Tailwind CSS, Lucide, React Query)
│   ├── app/
│   │   ├── page.tsx                   # Redirect to /dashboard
│   │   ├── login/page.tsx             # Admin Login (admin@7kaam.in / Admin@7kaam)
│   │   ├── dashboard/page.tsx         # Platform Overview & Key Metrics
│   │   ├── workers/page.tsx           # Worker Directory with status & KaamCard filters
│   │   ├── workers/[id]/page.tsx      # Worker Profile, HTML5 Skill Video Player, Manual Scoring, Issue/Revoke KaamCard
│   │   ├── tests/page.tsx             # Trade Test Catalogue & Management
│   │   └── analytics/page.tsx         # Score distribution & certification metrics
│   └── package.json                   # Next.js 14 setup
│
├── user_app/customer_app/             # Customer Mobile App (Flutter, Riverpod, Dio, GoRouter)
│   ├── lib/
│   │   ├── main.dart                  # Flutter entry point
│   │   ├── core/                      # AppColors, ApiConstants, DioClient, ApiService, AppRouter
│   │   ├── models/                    # WorkerPublicModel, CustomerModel, ScoreBreakdown
│   │   ├── providers/                 # AuthNotifier, DiscoveryNotifier (Live Supabase API integration)
│   │   └── screens/
│   │       ├── splash/                # Animated Splash Screen
│   │       ├── onboarding/            # Product Onboarding
│   │       ├── auth/                  # Customer Login & Registration
│   │       ├── home/                  # 3-Tab Bottom Nav (Discover, Scan QR, Profile)
│   │       ├── discover/              # Worker Directory, Trade Chips, Tier Filters, Call Worker button
│   │       ├── worker_detail/         # Detailed Profile, Sticky "Call Worker" & "WhatsApp Contact" bar
│   │       ├── verify/                # QR Scanner for physical KaamCards
│   │       └── profile/               # Customer Profile & Settings
│   └── pubspec.yaml                   # Flutter dependencies
│
└── user_app/flutter_sample_1/         # Worker Mobile App (Flutter, Riverpod, Dio)
    ├── lib/
    │   ├── main.dart                  # Flutter entry point
    │   ├── core/                      # ApiConstants, ApiService, SecureStorage
    │   ├── models/                    # WorkerModel, TradeTestModel, KaamCardModel
    │   ├── providers/                 # AuthNotifier, WorkerNotifier, KaamCardNotifier
    │   └── screens/
    │       ├── auth/                  # Worker Phone/OTP Login & Registration
    │       ├── dashboard/             # Worker Home Dashboard
    │       ├── pipeline/              # 3-Step Certification Pipeline
    │       ├── kaam_card/             # Living Digital KaamCard & "Profile Listed under Admin Review" view
    │       └── certificates/          # Issued Skill Certificates
    └── pubspec.yaml                   # Flutter dependencies
```

---

## 🗄️ 3. Database Schema & Supabase Models

- **Database Engine**: PostgreSQL (Supabase Cloud)
- **Database URL**: `postgresql://postgres.qywflwdkrckyjdrsadvo:Yazugrang30%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`

### Key Models:
1. **Worker**:
   - `id`, `fullName`, `phoneNumber` (Unique), `trade`, `city`, `locality`, `profilePhotoUrl`, `aadhaarHash`, `aadhaarVerified`
   - `videoUrl`, `videoScore`, `videoScoredAt`, `videoNotes`
   - `testScore`, `testScoredAt`
   - `workHistoryScore`
   - `finalScore`, `tier`, `kaamCardUrl`, `qrCodeUrl`, `kaamCardIssuedAt`
   - `status` (`PENDING` | `ACTIVE` | `SUSPENDED`)
2. **KaamCard**:
   - `id`, `workerId`, `qrToken` (Unique), `pdfUrl`, `version`, `isRevoked`, `revocationReason`, `issuedAt`, `expiresAt`
3. **Customer**:
   - `id`, `fullName`, `phoneNumber` (Unique), `city`, `createdAt`
4. **Admin**:
   - `id`, `email` (Unique), `passwordHash`, `role` (`SUPER_ADMIN` | `REVIEWER`)
5. **TradeTest**:
   - `id`, `trade`, `language`, `title`, `description`, `category`, `difficulty`, `estimatedMinutes`, `passingScore`, `questions` (JSON)

---

## 🌐 4. Complete REST API Specifications

**Base URL**: `http://localhost:8000/api/v1`

### Authentication Endpoints
- `POST /api/v1/auth/login`
  - Body: `{ "email": "admin@7kaam.in", "password": "Admin@7kaam" }`
  - Response: `{ "token": "<JWT>", "admin": { ... } }`
- `POST /api/v1/auth/worker/login`
  - Body: `{ "phone": "9876543210", "otp": "1234" }`
  - Response: `{ "success": true, "token": "<JWT>", "worker": { ... } }`
- `POST /api/v1/auth/customer/login`
  - Body: `{ "phone": "9988776655", "otp": "1234" }`
  - Response: `{ "success": true, "token": "<JWT>", "customer": { ... } }`

### Mobile & Public Discovery Endpoints
- `GET /api/v1/mobile/workers/nearby?city=Bangalore&trade=ELECTRICIAN&tier=EXPERT`
  - Returns array of listed workers with phone numbers, score breakdowns, and KaamCard statuses.
- `GET /api/v1/mobile/workers/:id/public`
  - Returns public worker profile formatted for Customer App.
- `POST /api/v1/mobile/workers/register`
  - Body: `{ "name": "Anil Kumar", "phone": "9123456789", "trade": "PLUMBER", "city": "Bangalore", "locality": "Indiranagar" }`
- `POST /api/v1/mobile/customers/register`
  - Body: `{ "name": "Priya Sharma", "phone": "9871234567", "city": "Bangalore" }`

### Assessment & Scoring Pipeline
- `POST /api/v1/workers/:id/score-video`
  - Body: `{ "score": 85, "notes": "Great practical demonstration" }`
- `POST /api/v1/workers/:id/compute-score`
  - Computes composite final score (`0.40 * video + 0.35 * test + 0.25 * workHistory`) and updates Tier.
- `POST /api/v1/workers/:id/issue-kaamcard`
  - Generates digital KaamCard with unique QR Token and PDF download URL.
- `POST /api/v1/workers/:id/add-work-history`
  - Body: `{ "employerName": "Sobha Developers", "role": "Electrician", "rating": 5, "verified": true }`

### QR Verification
- `GET /api/v1/verify/:qrToken`
  - Returns public card verification details.

---

## 🛠️ 5. Running the System Locally

1. **Backend REST API (Port 8000)**:
   ```bash
   cd c:\Codes\7-Kaam\7kaam\backend
   npm start
   ```

2. **Admin Web Dashboard (Port 3000)**:
   ```bash
   cd c:\Codes\7-Kaam\7kaam\dashboard
   npm run dev
   ```

3. **Worker Mobile App (Port 8081)**:
   ```bash
   cd c:\Codes\7-Kaam\7kaam\user_app\flutter_sample_1
   flutter run -d web-server --web-port 8081
   ```

4. **Customer Mobile App (Port 8083)**:
   ```bash
   cd c:\Codes\7-Kaam\7kaam\user_app\customer_app
   flutter run -d web-server --web-port 8083
   ```
