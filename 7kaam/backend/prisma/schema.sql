-- 7 Kaam Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qywflwdkrckyjdrsadvo/editor

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Trade" AS ENUM ('ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER');
CREATE TYPE "Tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'EXPERT');
CREATE TYPE "WorkerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER');
CREATE TYPE "TestLanguage" AS ENUM ('ENGLISH', 'HINDI', 'KANNADA', 'TAMIL');
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'EVALUATING', 'COMPLETED', 'FAILED');
CREATE TYPE "SignalType" AS ENUM ('VIDEO', 'TEST', 'WORK_HISTORY', 'FINAL');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "aadhaarHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "trade" "Trade" NOT NULL,
    "city" TEXT NOT NULL,
    "locality" TEXT,
    "videoUrl" TEXT,
    "videoScore" DOUBLE PRECISION,
    "videoScoredAt" TIMESTAMP(3),
    "testScore" DOUBLE PRECISION,
    "testScoredAt" TIMESTAMP(3),
    "workHistoryScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "tier" "Tier",
    "kaamCardUrl" TEXT,
    "qrCodeUrl" TEXT,
    "kaamCardIssuedAt" TIMESTAMP(3),
    "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'REVIEWER',
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeTest" (
    "id" TEXT NOT NULL,
    "trade" "Trade" NOT NULL,
    "language" "TestLanguage" NOT NULL,
    "title" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestSubmission" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "rawScore" DOUBLE PRECISION,
    "aiEvaluation" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkHistory" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "employerPhone" TEXT,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "rating" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KaamCard" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "qrToken" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedReason" TEXT,
    CONSTRAINT "KaamCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoringLog" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "inputData" JSONB,
    "outputScore" DOUBLE PRECISION NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "ScoringLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "trade" "Trade" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Worker_aadhaarHash_key" ON "Worker"("aadhaarHash");
CREATE UNIQUE INDEX "Worker_phoneNumber_key" ON "Worker"("phoneNumber");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX "KaamCard_qrToken_key" ON "KaamCard"("qrToken");
CREATE UNIQUE INDEX "Customer_phoneNumber_key" ON "Customer"("phoneNumber");

-- Foreign Keys
ALTER TABLE "TradeTest" ADD CONSTRAINT "TradeTest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestSubmission" ADD CONSTRAINT "TestSubmission_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestSubmission" ADD CONSTRAINT "TestSubmission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "TradeTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkHistory" ADD CONSTRAINT "WorkHistory_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KaamCard" ADD CONSTRAINT "KaamCard_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScoringLog" ADD CONSTRAINT "ScoringLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
