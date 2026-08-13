// ── Enums ─────────────────────────────────────────────────────────────────────

export type Trade = 'ELECTRICIAN' | 'PLUMBER' | 'CARPENTER' | 'AC_TECHNICIAN' | 'PAINTER' | 'WELDER';
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'EXPERT';
export type WorkerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type AdminRole = 'SUPER_ADMIN' | 'CITY_ADMIN' | 'REVIEWER';
export type TestLanguage = 'ENGLISH' | 'HINDI' | 'KANNADA' | 'TAMIL';
export type SubmissionStatus = 'SUBMITTED' | 'EVALUATING' | 'COMPLETED' | 'FAILED';
export type SignalType = 'VIDEO' | 'TEST' | 'WORK_HISTORY' | 'FINAL';
export type ReportStatus = 'OPEN' | 'DISMISSED' | 'ACTIONED';

// ── Listing provenance ────────────────────────────────────────────────────────
// Who put this row in the database. Orthogonal to WorkerStatus (lifecycle) and
// to Tier (trust). 'PUBLIC_DIRECTORY' rows were scraped from a third-party
// directory; the named person never signed up and never consented.
export type ListingSource = 'SELF_SIGNUP' | 'PUBLIC_DIRECTORY';

// Three states, not two. There is no `isClaimed` boolean anywhere — a boolean
// plus a status is two sources of truth that will disagree.
export type ClaimStatus = 'UNCLAIMED' | 'CLAIM_PENDING' | 'CLAIMED';

// ── Models ────────────────────────────────────────────────────────────────────

export interface Worker {
  id: string;
  // CHANGED: nullable. Directory imports write NULL — no placeholder hash is
  // invented. getWorker/listWorkers return the raw row, so this key really does
  // reach the dashboard.
  aadhaarHash?: string | null;
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
  underReview?: boolean;
  recertificationTestIds?: string[];
  recertificationReason?: string;

  // ── Listing provenance (see §A.2) ───────────────────────────────────────────
  // listingSource and claimStatus are REQUIRED, never optional. An optional
  // field is `undefined`, and `undefined` reads as "self-registered" in every
  // truthiness check in this codebase — which is exactly how an unverified
  // stranger silently becomes a verified-looking one.
  listingSource: ListingSource;
  claimStatus: ClaimStatus;
  sourceName?: string | null;
  sourceRef?: string | null;
  sourceUrl?: string | null;
  sourceAddress?: string | null;
  importBatchId?: string | null;
  importedAt?: string | null;
  claimRequestedAt?: string | null;
  claimedAt?: string | null;
  suppressedAt?: string | null;
  suppressionReason?: string | null;
  tradeInferred?: boolean;

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
  clientName: string;
  clientType: string;
  clientPhone?: string;
  clientCity: string;
  projectTitle: string;
  projectDescription: string;
  trade: Trade;
  startDate: string;
  endDate?: string;
  durationMonths: number;
  projectScale: string;
  photoUrls: string[];
  isVerified: boolean;
  createdAt: string;
}

export interface SkillCertificate {
  id: string;
  workerId: string;
  testId: string;
  testTitle: string;
  trade: Trade;
  category: string;
  difficulty: string;
  score: number;
  passingScore: number;
  issuedAt: string;
  pdfUrl?: string;
  certificateNo?: string;
}

export interface Report {
  id: string;
  workerId: string;
  reporterCustomerId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  createdAt: string;
  worker?: Partial<Worker>;
  reporterCustomer?: { fullName: string; phoneNumber: string };
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

// AI decision bands from Video_processing/src/sevenkaam/reason_codes.py.
// Not truth, not a probability — an operational label over available evidence.
export type AiDecision =
  | 'insufficient_evidence'
  | 'needs_resubmission'
  | 'human_review'
  | 'provisionally_verified'
  | 'strongly_verified';

export interface AiComponentScores {
  identity: number;
  media: number;
  workspace: number;
  tools: number;
  task: number;
  safety: number;
  knowledge: number;
}

export interface AiAssessmentReport {
  strengths: string[];
  improvements: string[];
  limitations: string[];
}

// The shape written into VideoAssessment.rubricScores.ai by
// Video_processing/src/sevenkaam/integration/mapping.py — namespaced under
// `ai` so it never collides with a human reviewer's own rubric conventions.
export interface AiRubricScores {
  ai: {
    engineVersion: string;
    ruleVersion: string;
    tradeId: string;
    challengeId?: string;
    components: AiComponentScores;
    initialScore: number;
    score100: number;
    evidenceCoverage: number;
    decision: AiDecision;
    reasonCodes: string[];
    missingEvidence: string[];
    adapterModes: Record<string, string>;
    report: AiAssessmentReport;
    writeback: {
      scoringLogWritten: boolean;
      scoringLogNoteTag?: string;
      policyNote: string;
    };
  };
}

// VideoAssessment — written by the Video_processing AI engine, never by a
// human directly. `score` is null unless the assessment was actually
// promoted into Worker.videoScore (see writeback.ai.scoringLogWritten).
export interface VideoAssessment {
  id: string;
  workerId: string;
  testId: string;
  videoUrl: string;
  score?: number | null;
  rubricScores?: AiRubricScores | null;
  feedback?: string;
  status: string; // e.g. "AI_STRONGLY_VERIFIED" — free text, AI_-prefixed by convention
  attemptNumber: number;
  submittedAt: string;
  scoredAt?: string;
  test?: TradeTest;
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
  activeWorkers: number;
  suspendedWorkers: number;
  totalKaamCardsIssued: number;
  certifiedToday: number;
  averageScore: number;
  activeCities: number;
  tierBreakdown: Array<{ tier: Tier; count: number }>;
  newRegistrationsThisWeek: number;
  testsAttemptedToday: number;
  certificatesIssuedToday: number;
}

export interface PendingReviewResponse {
  workers: Worker[];
  total: number;
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
