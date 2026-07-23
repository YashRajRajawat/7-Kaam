// ── Enums ─────────────────────────────────────────────────────────────────────

export type Trade = 'ELECTRICIAN' | 'PLUMBER' | 'CARPENTER' | 'AC_TECHNICIAN' | 'PAINTER' | 'WELDER';
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'EXPERT';
export type WorkerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type AdminRole = 'SUPER_ADMIN' | 'CITY_ADMIN' | 'REVIEWER';
export type TestLanguage = 'ENGLISH' | 'HINDI' | 'KANNADA' | 'TAMIL';
export type SubmissionStatus = 'SUBMITTED' | 'EVALUATING' | 'COMPLETED' | 'FAILED';
export type SignalType = 'VIDEO' | 'TEST' | 'WORK_HISTORY' | 'FINAL';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// ── Models ────────────────────────────────────────────────────────────────────

export interface Worker {
  id: string;
  aadhaarHash: string;
  fullName: string;
  phoneNumber: string;
  profilePhotoUrl?: string;
  trade: Trade;
  city: string;
  locality?: string;
  videoUrl?: string;
  videoScore?: number;
  videoScoredAt?: string;
  testScore?: number;
  testScoredAt?: string;
  workHistoryScore?: number;
  finalScore?: number;
  tier?: Tier;
  kaamCardUrl?: string;
  qrCodeUrl?: string;
  kaamCardIssuedAt?: string;
  aadhaarVerified: boolean;
  status: WorkerStatus;
  createdAt: string;
  updatedAt: string;
  workHistories?: WorkHistory[];
  testSubmissions?: TestSubmission[];
  kaamCards?: KaamCard[];
  scoringLogs?: ScoringLog[];
}

export interface Admin {
  id: string;
  email: string;
  role: AdminRole;
  city?: string;
  createdAt: string;
}

export interface TradeTest {
  id: string;
  trade: Trade;
  language: TestLanguage;
  title: string;
  questions: Question[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  admin?: { email: string };
  _count?: { submissions: number };
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface TestSubmission {
  id: string;
  workerId: string;
  testId: string;
  answers: string[];
  rawScore?: number;
  aiEvaluation?: AiEvaluation;
  status: SubmissionStatus;
  submittedAt: string;
  test?: TradeTest;
}

export interface AiEvaluation {
  totalScore: number;
  breakdown: Array<{
    question: string;
    workerAnswer: string;
    score: number;
    feedback: string;
  }>;
  overallFeedback: string;
}

export interface WorkHistory {
  id: string;
  workerId: string;
  employerName: string;
  employerPhone?: string;
  role: string;
  startDate: string;
  endDate?: string;
  rating: number;
  verified: boolean;
  createdAt: string;
}

export interface KaamCard {
  id: string;
  workerId: string;
  scoreBreakdown: {
    videoScore: number;
    testScore: number;
    workHistoryScore: number;
    finalScore: number;
    tier: Tier;
  };
  qrToken: string;
  pdfUrl?: string;
  version: number;
  issuedAt: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedReason?: string;
  worker?: Partial<Worker>;
}

export interface ScoringLog {
  id: string;
  workerId: string;
  signalType: SignalType;
  inputData?: unknown;
  outputScore: number;
  scoredAt: string;
  notes?: string;
  worker?: Partial<Worker>;
}

// ── API Response Types ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsOverview {
  totalWorkers: number;
  certifiedToday: number;
  averageScore: number;
  activeCities: number;
  tierBreakdown: Array<{ tier: Tier; count: number }>;
}

export interface TradeBreakdown {
  trade: Trade;
  count: number;
  avgScore: number;
}

export interface CityBreakdown {
  city: string;
  workers: number;
  certified: number;
  avgScore: number;
}

export interface ScoreBand {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface CertificationDataPoint {
  date: string;
  count: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: Admin;
}
