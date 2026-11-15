import type { Role, ApplicationStatus } from "@prisma/client";

export type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type KnowledgeContext = {
  serviceId: string;
  code: string;
  name: string;
  description: string | null;
  requirements: string[];
  estimatedTime: string | null;
  url: string;
  documents: Array<{ title: string; kind: string; content: string }>;
};

export interface HistoryContext {
  applicationNumber?: string;
  serviceCode?: string;
  activeTopic?:
    | "unverified"
    | "approval"
    | "repair"
    | "decision"
    | "sktm_count"
    | "skck_count"
    | "audit_log"
    | "volume_stats"
    | "performance"
    | "dashboard"
    | "general";
  referencedAppNumbers?: string[];
  referencedApplicantName?: string;
  referencedStaffName?: string;
  lastQuestion?: string;
}

export type UserApplicationContext = {
  id?: string;
  nomor_pengajuan: string;
  maskedNomorPengajuan?: string;
  serviceName: string;
  serviceCode: string;
  status: string;
  submittedAt: string;
  updatedAt?: string;
  latestNote?: string | null;
  needsRepair: boolean;
  documents: Array<{ requirementName: string; fileName: string }>;
};

export type VerificationDocumentCheck = {
  requirementName: string;
  isUploaded: boolean;
  fileName?: string;
  fileSize?: number;
};

export type ApplicationDetailContext = {
  id: string;
  nomor_pengajuan: string;
  maskedNomorPengajuan?: string;
  serviceCode: string;
  serviceName: string;
  status: ApplicationStatus | string;
  applicantName: string;
  applicantNik: string | null;
  submittedAt: string;
  updatedAt?: string;
  formData: Record<string, unknown>;
  notes: string | null;
  latestNote: string | null;
  needsRepair: boolean;
  requirements: string[];
  uploadedDocuments: Array<{ requirementName: string; fileName: string; fileSize?: number }>;
  documentChecks: VerificationDocumentCheck[];
  missingRequirements: string[];
  isComplete: boolean;
  detailUrl: string;
  historySummary?: Array<{ status: string; actorName: string; note: string | null; createdAt: string }>;
};

export type QueueStatistics = {
  role: Role;
  roleLabel: string;
  targetStatus: string;
  totalWaitingVerification: number;
  waitingList: Array<{
    id: string;
    nomor_pengajuan: string;
    maskedNomorPengajuan?: string;
    serviceName: string;
    applicantName: string;
    status: string;
    submittedAt: string;
    updatedAt?: string;
    detailUrl: string;
  }>;
  totalPerluPerbaikan?: number;
  totalDiproses?: number;
  totalSelesai?: number;
  totalDiajukan?: number;
  totalReviewSupervisor?: number;
  totalMenungguApproval?: number;
};

export type StaffVerificationAudit = {
  id: string;
  nomor_pengajuan: string;
  maskedNomorPengajuan?: string;
  serviceName: string;
  serviceCode: string;
  applicantName: string;
  applicantNik: string | null;
  status: string;
  updatedAt?: string;
  staffName: string;
  staffActions: Array<{
    oldStatus: string | null;
    newStatus: string;
    note: string | null;
    date: string;
  }>;
  uploadedDocuments: Array<{ requirementName: string; fileName: string }>;
  missingRequirements: string[];
  isComplete: boolean;
  qcRecommendation: string;
  detailUrl: string;
};

export type ProcessStatistics = {
  totalApplications: number;
  byStatus: Record<string, number>;
  byService: Record<string, number>;
  pendingStaffCount: number; // DIAJUKAN + DIVERIFIKASI + DIPROSES
  pendingReviewCount: number; // REVIEW_SUPERVISOR
  pendingApprovalCount: number; // MENUNGGU_APPROVAL
  completedCount: number; // DISETUJUI + SELESAI
  repairCount: number; // PERLU_PERBAIKAN
  rejectedCount: number; // DITOLAK
  reworkRatePercent: number;
  completionRatePercent: number;
};

export type DemographicStatistics = {
  totalWarga: number;
  wargaByGender: Record<string, number>;
  wargaList: Array<{
    name: string;
    nik: string | null;
    gender: string;
    address?: string | null;
    phone?: string | null;
  }>;
  wargaFullList?: Array<{
    id: string;
    name: string;
    nik: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    totalApplications: number;
    isActive: boolean;
    createdAt: string;
    gender: string;
  }>;
  totalUsers: number;
  usersByRole: Record<string, number>;
  systemUsers?: Array<{
    id: string;
    name: string;
    email: string;
    nik: string | null;
    role: Role;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
};

export type ServiceApplicationsSummary = {
  sktm: {
    code: string;
    name: string;
    total: number;
    byStatus: Record<string, number>;
    recentApplications: Array<{
      nomor_pengajuan: string;
      maskedNomorPengajuan?: string;
      applicantName: string;
      status: string;
      submittedAt: string;
      updatedAt?: string;
      keperluan?: string;
      detailUrl: string;
    }>;
  };
  skck: {
    code: string;
    name: string;
    total: number;
    byStatus: Record<string, number>;
    recentApplications: Array<{
      nomor_pengajuan: string;
      maskedNomorPengajuan?: string;
      applicantName: string;
      status: string;
      submittedAt: string;
      updatedAt?: string;
      keperluan?: string;
      detailUrl: string;
    }>;
  };
};

export type ServiceActivityLog = {
  id: string;
  applicationNumber: string;
  serviceName: string;
  actorName: string;
  actorRole: string;
  oldStatus: string | null;
  newStatus: string;
  note: string | null;
  date: string;
  detailUrl: string;
};

export type AuditLogSummary = {
  isAllowed: boolean;
  denialReason?: string;
  logs: Array<{
    id: string;
    time: string;
    actorName: string;
    actorRole: string;
    action: string;
    entity: string;
    entityId?: string | null;
    metadataSummary?: string;
  }>;
};

export type UserProfileContext = {
  id: string;
  name: string;
  email: string;
  nik: string | null;
  phone: string | null;
  address: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  emailVerified: string | null;
  totalApplications?: number;
};

export type KadesDashboardSummary = {
  total: number;
  totalSktm: number;
  totalSkck: number;
  menungguVerifikasi: number;
  sedangDiproses: number;
  menungguPersetujuan: number;
  disetujui: number;
  ditolak: number;
  perluPerbaikan: number;
  pendingLetterCount?: number;
  sentLetterCount?: number;
  pendingApprovalList?: Array<{
    id: string;
    nomor_pengajuan: string;
    maskedNomorPengajuan?: string;
    applicantName: string;
    serviceName: string;
    submittedAt: string;
    detailUrl: string;
  }>;
  serviceStats: Array<{ name: string; count: number }>;
  performance: {
    completedSample: number;
    averageCompletionDays: number | null;
  };
  today: {
    date: string;
    totalSubmittedToday: number;
    totalApprovedToday: number;
    applications: Array<{
      id: string;
      nomor_pengajuan: string;
      maskedNomorPengajuan?: string;
      serviceName: string;
      applicantName: string;
      status: string;
      time: string;
      detailUrl: string;
    }>;
  };
  monthly?: {
    thisMonthName: string;
    submittedThisMonth: number;
    approvedThisMonth: number;
    lastMonthName: string;
    submittedLastMonth: number;
    sktmThisMonth?: number;
    sktmLastMonth?: number;
    skckThisMonth?: number;
    skckLastMonth?: number;
  };
};

export type AiProviderType = "grok" | "gemini" | "nvidia";

export type AiVersionId = "fast" | "standard" | "pro";

export interface AiVersionInfo {
  id: AiVersionId;
  label: string;
  shortLabel: string;
  description: string;
  provider: AiProviderType;
  model: string;
  isConfigured: boolean;
  isDefault?: boolean;
}

export interface AiProviderInfo {
  id: AiProviderType;
  name: string;
  model: string;
  isConfigured: boolean;
  isDefault?: boolean;
}

export interface AiProvider {
  readonly id: AiProviderType;
  readonly name: string;
  getModel(): string;
  isConfigured(): boolean;
  answer(input: {
    question: string;
    history: AiMessage[];
    context: KnowledgeContext[];
    role?: Role;
    userName?: string;
    userId?: string;
    userProfile?: UserProfileContext;
    userApplications?: UserApplicationContext[];
    queueStats?: QueueStatistics;
    matchedApplications?: ApplicationDetailContext[];
    processStats?: ProcessStatistics;
    staffAuditList?: StaffVerificationAudit[];
    demographics?: DemographicStatistics;
    servicesSummary?: ServiceApplicationsSummary;
    serviceActivities?: ServiceActivityLog[];
    auditLogSummary?: AuditLogSummary;
    dashboardSummary?: KadesDashboardSummary;
    kadesSelectiveContext?: string;
    isDatabaseAvailable?: boolean;
    modelOverride?: string;
    apiKeyOverride?: string;
    temperatureOverride?: number;
    maxTokensOverride?: number;
  }): Promise<string>;
}

