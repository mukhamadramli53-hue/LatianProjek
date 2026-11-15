import { prisma } from "../db";
import type { ApplicationStatus, Role } from "@prisma/client";
import type {
  AiMessage,
  AuditLogSummary,
  DemographicStatistics,
  KadesDashboardSummary,
  ServiceActivityLog,
  UserProfileContext,
} from "./types";

export type KadesIntentType =
  | "identity_self"
  | "identity_user"
  | "feature_explanation"
  | "master_services"
  | "app_count_total"
  | "app_count_service"
  | "app_status_filter"
  | "app_list"
  | "applicant_identity"
  | "staff_processor"
  | "waiting_duration"
  | "monthly_comparison"
  | "service_volume_performance"
  | "bottleneck_analysis"
  | "users_roles_demographics"
  | "audit_log"
  | "service_activities"
  | "dashboard_overview"
  | "specific_application"
  | "summary_followup"
  | "general_help";

export type KadesStatusScope =
  | ApplicationStatus
  | "PROCESSING_STAF"
  | "APPROVED_DONE"
  | "VERIFIED_DONE"
  | "ALL_OPEN";

export interface KadesClassification {
  intent: KadesIntentType;
  statusScope?: KadesStatusScope;
  serviceScope?: "SKTM" | "SP-SKCK" | "BOTH";
  comparedServices: string[];
  periodScope?: "today" | "this_month" | "last_month" | "compare_months" | "all";
  appNumbers: string[];
  fourDigitFilter?: string;
  applicantQuery?: string;
  sortOldestFirst: boolean;
  isFollowUp: boolean;
  topicSwitched: boolean;
  featureTopic?: string;
  needsDashboardMetrics: boolean;
  needsApplications: boolean;
  needsStaffHistory: boolean;
  needsServicesMaster: boolean;
  needsUsersRoles: boolean;
  needsAuditLogs: boolean;
  needsActivities: boolean;
  needsProfile: boolean;
}

export interface KadesLiveApplicationRow {
  id: string;
  nomor_pengajuan: string;
  maskedNomorPengajuan: string;
  serviceCode: string;
  serviceName: string;
  estimatedTime: string | null;
  status: ApplicationStatus;
  applicantName: string;
  applicantEmail: string;
  applicantNik: string | null;
  applicantPhone: string | null;
  submittedAtDate: Date;
  updatedAtDate: Date;
  submittedAtFormatted: string;
  updatedAtFormatted: string;
  waitingDays: number;
  waitingHours: number;
  notes: string | null;
  latestNote: string | null;
  staffProcessors: Array<{
    actorName: string;
    actorRole: Role;
    oldStatus: ApplicationStatus | null;
    newStatus: ApplicationStatus;
    note: string | null;
    dateFormatted: string;
  }>;
  allHistory: Array<{
    actorName: string;
    actorRole: Role;
    oldStatus: ApplicationStatus | null;
    newStatus: ApplicationStatus;
    note: string | null;
    dateFormatted: string;
  }>;
  missingRequirements: string[];
  uploadedRequirements: string[];
  detailUrl: string;
}

export interface KadesLiveServiceMaster {
  id: string;
  code: string;
  name: string;
  description: string | null;
  estimatedTime: string | null;
  isActive: boolean;
  requirements: string[];
  applicationCount: number;
  knowledgeDocs: Array<{ title: string; kind: string; content: string }>;
}

export interface KadesSelectiveContextBundle {
  classification: KadesClassification;
  nowFormatted: string;
  userProfile?: UserProfileContext;
  dashboardSummary?: KadesDashboardSummary;
  applications: KadesLiveApplicationRow[];
  servicesMaster: KadesLiveServiceMaster[];
  demographics?: DemographicStatistics;
  auditLogs?: AuditLogSummary;
  activities: ServiceActivityLog[];
  contextText: string;
}

function maskNomor(nomor: string): string {
  const parts = nomor.split("-");
  if (parts.length >= 3) {
    const last = parts[2];
    const maskedLast = last.length > 2 ? "*".repeat(last.length - 1) + last.slice(-1) : "***";
    return `${parts[0]}-${parts[1]}-${maskedLast}`;
  }
  return nomor.length > 4 ? `${nomor.slice(0, 3)}***${nomor.slice(-2)}` : nomor;
}

function parseReqs(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string");
  if (typeof value === "string") {
    try {
      return parseReqs(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function formatIdDate(date: Date, withTime = false): string {
  return date.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function parseSlaDays(estimatedTime?: string | null): number | null {
  if (!estimatedTime) return null;
  const m = estimatedTime.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function isBoilerplateWelcome(msg: AiMessage): boolean {
  if (msg.role !== "assistant") return false;
  const c = msg.content;
  return (
    c.includes("Selamat datang Bapak") ||
    c.includes("Saya Asisten Pelayanan Desa untuk Monitoring") ||
    c.includes("Ada aspek monitoring berkas") ||
    c.includes("Ada yang bisa saya bantu?")
  );
}

/**
 * Strips system welcome menus and prevents duplicate current user prompt
 * from polluting conversation topic state.
 */
export function normalizeConversationHistory(
  question: string,
  history?: AiMessage[]
): AiMessage[] {
  if (!history || history.length === 0) return [];
  const trimmedQ = question.trim().toLowerCase();
  const filtered = history.filter((m) => !isBoilerplateWelcome(m));
  if (
    filtered.length > 0 &&
    filtered[filtered.length - 1].role === "user" &&
    filtered[filtered.length - 1].content.trim().toLowerCase() === trimmedQ
  ) {
    return filtered.slice(0, -1);
  }
  return filtered;
}

function extractAppNumbers(text: string): string[] {
  const matches = text.match(/PD-\d{6}-\d{4}/gi) || [];
  const uniq: string[] = [];
  for (const m of matches) {
    const up = m.toUpperCase();
    if (!uniq.includes(up)) uniq.push(up);
  }
  return uniq;
}

function detectFeatureTopic(q: string): string | undefined {
  if (q.includes("master layanan") || q.includes("menu layanan")) return "master_layanan";
  const isImageOrDashboardApprovedCard =
    !q.includes("seluruh") &&
    !q.includes("semua") &&
    !q.includes("ringkasan") &&
    ((q.includes("fitur") || q.includes("kartu") || q.includes("status") || q.includes("database")) &&
      (q.includes("kirim") || q.includes("gambar") || q.includes("1 ini") || q.includes("centang hijau")));

  if (
    q.includes("pengajuan disetujui") ||
    q.includes("telah disetujui") ||
    q.includes("disetujui / selesai") ||
    q.includes("disetujui/selesai") ||
    isImageOrDashboardApprovedCard
  ) {
    return "pengajuan_disetujui";
  }
  if (q.includes("persetujuan") || q.includes("pengiriman surat")) return "persetujuan";
  if (q.includes("kelola user") || q.includes("kelola pengguna") || q.includes("menu user")) return "kelola_user";
  if (q.includes("menu laporan") || q.includes("fitur laporan")) return "laporan";
  if (q.includes("audit log")) return "audit_log";
  if (q.includes("dashboard")) return "dashboard";
  if (q.includes("profil")) return "profil";
  if (q.includes("notifikasi")) return "notifikasi";
  if (q.includes("asisten ai") || q.includes("chatbot")) return "asisten_ai";
  return undefined;
}

function detectExplicitService(q: string): "SKTM" | "SP-SKCK" | "BOTH" | undefined {
  const hasSktm = q.includes("sktm") || q.includes("tidak mampu");
  const hasSkck = q.includes("skck") || q.includes("sp-skck") || q.includes("kepolisian");
  if (hasSktm && hasSkck) return "BOTH";
  if (hasSktm) return "SKTM";
  if (hasSkck) return "SP-SKCK";
  return undefined;
}

function detectExplicitStatus(q: string): KadesStatusScope | undefined {
  if (
    q.includes("belum diverifikasi") ||
    q.includes("belum di verifikasi") ||
    q.includes("menunggu verifikasi") ||
    q.includes("status diajukan") ||
    (q.includes("belum") && q.includes("verifikasi"))
  ) {
    return "DIAJUKAN";
  }
  if (
    q.includes("sedang diproses") ||
    q.includes("penyiapan berkas") ||
    q.includes("status diproses") ||
    q.includes("diverifikasi") && !q.includes("belum") && !q.includes("sudah") && !q.includes("telah")
  ) {
    return "PROCESSING_STAF";
  }
  if (
    q.includes("sudah diverifikasi") ||
    q.includes("telah diverifikasi") ||
    q.includes("yang sudah diperiksa")
  ) {
    return "VERIFIED_DONE";
  }
  if (
    q.includes("menunggu persetujuan") ||
    q.includes("menunggu approval") ||
    q.includes("meja kepala desa") ||
    q.includes("meja kades") ||
    q.includes("perlu saya setujui") ||
    q.includes("siap disetujui")
  ) {
    return "MENUNGGU_APPROVAL";
  }
  const isImageOrDashboardApprovedCard =
    !q.includes("seluruh") &&
    !q.includes("semua") &&
    !q.includes("ringkasan") &&
    ((q.includes("fitur") || q.includes("kartu") || q.includes("status") || q.includes("database")) &&
      (q.includes("kirim") || q.includes("gambar") || q.includes("1 ini") || q.includes("centang hijau")));

  if (
    q.includes("sudah disetujui") ||
    q.includes("telah disetujui") ||
    q.includes("pengajuan disetujui") ||
    (q.includes("disetujui") && !q.includes("belum")) ||
    (q.includes("centang hijau") && (q.includes("kartu") || q.includes("fitur") || q.includes("status") || q.includes("gambar"))) ||
    isImageOrDashboardApprovedCard
  ) {
    return "APPROVED_DONE";
  }
  if (q.includes("perlu perbaikan") || q.includes("perlu diperbaiki") || q.includes("revisi")) {
    return "PERLU_PERBAIKAN";
  }
  if (q.includes("ditolak")) {
    return "DITOLAK";
  }
  if (q.includes("review supervisor")) {
    return "REVIEW_SUPERVISOR";
  }
  if (q.includes("selesai")) {
    return "SELESAI";
  }
  return undefined;
}

function detectStandaloneIntent(q: string): KadesIntentType | null {
  const clean = q.replace(/[?!.,]/g, "").trim();

  if (
    clean === "siapa anda" ||
    clean === "anda siapa" ||
    clean === "siapa kamu" ||
    clean === "kamu siapa" ||
    q.includes("siapa anda") ||
    q.includes("siapa kamu")
  ) {
    return "identity_self";
  }

  if (
    clean === "siapa saya" ||
    clean === "saya siapa" ||
    q.includes("siapa saya") ||
    q.includes("profil saya") ||
    q.includes("akun saya") ||
    q.includes("nik saya") ||
    q.includes("email saya") ||
    q.includes("identitas saya")
  ) {
    return "identity_user";
  }

  const asksDashboardReadout =
    (q.includes("dashboard") ||
      q.includes("database") ||
      q.includes("data base") ||
      q.includes("gambar") ||
      q.includes("foto") ||
      q.includes("screenshot") ||
      q.includes("tangkapan layar") ||
      q.includes("fitur") ||
      q.includes("kartu") ||
      q.includes("statistik") ||
      q.includes("pelayanan")) &&
    !detectExplicitStatus(q) &&
    (q.includes("satu per satu") ||
      q.includes("satu persatu") ||
      q.includes("baca") ||
      q.includes("kartu") ||
      q.includes("bagian") ||
      q.includes("angka") ||
      q.includes("rincian") ||
      q.includes("isi") ||
      q.includes("semua") ||
      q.includes("seluruh") ||
      q.includes("minimal") ||
      q.includes("tampilkan") ||
      q.includes("lihat") ||
      q.includes("cerdas") ||
      q.includes("kirim") ||
      q.includes("atas") ||
      q.includes("ada") ||
      ((q.includes("fitur dashboard") ||
        q.includes("fitur di dashboard") ||
        q.includes("fitur yang") ||
        q.includes("fitur ini")) &&
        !q.includes("apa fungsi") &&
        !q.includes("kegunaan")));

  if (asksDashboardReadout) {
    return "dashboard_overview";
  }

  const isAskingFeaturePurpose =
    q.includes("apa fungsi") ||
    q.includes("fungsi menu") ||
    q.includes("fungsi fitur") ||
    q.includes("jelaskan fungsi") ||
    q.includes("jelaskan menu") ||
    q.includes("apa kegunaan") ||
    q.includes("kegunaan menu") ||
    q.includes("untuk apa") ||
    q.includes("apa itu master layanan") ||
    q.includes("apa itu persetujuan") ||
    q.includes("apa itu kelola user") ||
    q.includes("apa itu audit log");

  if (isAskingFeaturePurpose && detectFeatureTopic(q)) {
    return "feature_explanation";
  }

  if (
    (q.includes("master layanan") || q.includes("daftar layanan") || q.includes("layanan apa saja") || q.includes("sla layanan") || q.includes("syarat")) &&
    !q.includes("jumlah") &&
    !q.includes("total pengajuan") &&
    !q.includes("berapa pengajuan")
  ) {
    return "master_services";
  }

  if (
    q.includes("audit log") ||
    q.includes("log audit") ||
    q.includes("catatan audit") ||
    q.includes("riwayat login")
  ) {
    return "audit_log";
  }

  if (
    q.includes("jumlah role") ||
    q.includes("jumlah user") ||
    q.includes("user per role") ||
    q.includes("per role") ||
    q.includes("role atau akun") ||
    q.includes("akun yang terdaftar") ||
    q.includes("berapa akun") ||
    q.includes("jumlah akun") ||
    q.includes("total akun") ||
    q.includes("total user") ||
    q.includes("berapa user") ||
    q.includes("daftar user") ||
    q.includes("user terdaftar") ||
    q.includes("pengguna terdaftar") ||
    q.includes("kelola user") ||
    q.includes("jumlah warga") ||
    q.includes("jenis kelamin") ||
    q.includes("data warga") ||
    q.includes("daftar warga") ||
    q.includes("demografi")
  ) {
    return "users_roles_demographics";
  }

  if (
    q.includes("kendala") ||
    q.includes("hambatan") ||
    q.includes("masalah pelayanan") ||
    q.includes("bottleneck") ||
    q.includes("macet") ||
    q.includes("kenapa lambat")
  ) {
    return "bottleneck_analysis";
  }

  if (
    q.includes("staf yang memproses") ||
    q.includes("staff yang memproses") ||
    q.includes("petugas yang memproses") ||
    q.includes("siapa staf") ||
    q.includes("siapa petugas") ||
    q.includes("siapa verifikator") ||
    q.includes("diproses oleh") ||
    q.includes("hasil verifikasi staf")
  ) {
    return "staff_processor";
  }

  if (
    q.includes("paling lama menunggu") ||
    q.includes("berapa lama") ||
    q.includes("sudah berapa lama") ||
    q.includes("terlama menunggu") ||
    q.includes("paling lama antre")
  ) {
    return "waiting_duration";
  }

  if (
    q.includes("siapa yang mengajukan") ||
    q.includes("siapa saja yang mengajukan") ||
    q.includes("siapa pemohon") ||
    q.includes("nama pemohon")
  ) {
    return "applicant_identity";
  }

  if (
    q.includes("bulan ini") ||
    q.includes("bulan lalu") ||
    q.includes("bandingkan dengan bulan") ||
    q.includes("perbandingan bulan")
  ) {
    return "monthly_comparison";
  }

  if (
    q.includes("volume layanan") ||
    q.includes("rata-rata waktu penyelesaian") ||
    q.includes("performa penyelesaian") ||
    q.includes("paling banyak digunakan") ||
    q.includes("layanan terbanyak")
  ) {
    return "service_volume_performance";
  }

  if (
    q.includes("aktivitas proses") ||
    q.includes("riwayat aktivitas") ||
    q.includes("aktivitas pelayanan")
  ) {
    return "service_activities";
  }

  if (q.includes("berdasarkan status") || q.includes("masing-masing status") || q.includes("semua status")) {
    return "app_status_filter";
  }

  const appNums = extractAppNumbers(q);
  if (appNums.length > 0) {
    return "specific_application";
  }

  const explicitStatus = detectExplicitStatus(q);
  const isListVerb =
    q.includes("tampilkan") || q.includes("daftar") || q.includes("lihat") || q.includes("apa saja");
  const isApprovedCardCue =
    explicitStatus === "APPROVED_DONE" &&
    (q.includes("pengajuan disetujui") ||
      q.includes("telah disetujui") ||
      q.includes("disetujui / selesai") ||
      q.includes("disetujui/selesai") ||
      q.includes("centang hijau") ||
      q.includes("kirim") ||
      q.includes("gambar") ||
      q.includes("1 ini") ||
      q.includes("kartu") ||
      q.includes("fitur") ||
      q.includes("baca") ||
      q.includes("data"));

  if (
    explicitStatus &&
    !isListVerb &&
    (isApprovedCardCue ||
      q.includes("berapa") ||
      q.includes("jumlah") ||
      q.includes("ada berapa") ||
      q.includes("total") ||
      q.includes("mana") ||
      q.includes("baca") ||
      q.includes("fitur") ||
      q.includes("kartu") ||
      q.includes("rincian") ||
      q.includes("detail") ||
      q.includes("kenapa") ||
      q.includes("mengapa") ||
      q.includes("maksud") ||
      q.includes("arti") ||
      q.includes("cek") ||
      q.includes("info") ||
      q.includes("jelaskan") ||
      q.includes("data"))
  ) {
    return "app_status_filter";
  }

  const explicitService = detectExplicitService(q);
  if (explicitService && (q.includes("berapa") || q.includes("jumlah") || q.includes("total"))) {
    return "app_count_service";
  }

  if (
    (q.includes("total pengajuan") || q.includes("seluruh pengajuan") || q.includes("semua pengajuan") || q.includes("jumlah pengajuan")) &&
    !explicitStatus
  ) {
    return "app_count_total";
  }

  if (
    q.includes("daftar pengajuan") ||
    q.includes("tampilkan pengajuan") ||
    q.includes("lihat pengajuan") ||
    (explicitStatus && (q.includes("tampilkan") || q.includes("daftar") || q.includes("lihat") || q.includes("apa saja")))
  ) {
    return "app_list";
  }

  if (
    q.includes("dashboard") ||
    q.includes("database") ||
    q.includes("data base") ||
    q.includes("gambar") ||
    q.includes("foto") ||
    q.includes("screenshot") ||
    q.includes("hari ini") ||
    q.includes("perhari ini") ||
    q.includes("laporan pelayanan") ||
    q.includes("kondisi pelayanan") ||
    q.includes("rekap pelayanan") ||
    q.includes("data pelayanan") ||
    q.includes("data yang ada") ||
    q.includes("ringkasan pelayanan") ||
    q.includes("rekap data")
  ) {
    return "dashboard_overview";
  }

  return null;
}

interface ReconstructedPriorState {
  statusScope?: KadesStatusScope;
  serviceScope?: "SKTM" | "SP-SKCK" | "BOTH";
  comparedServices: string[];
  periodScope?: "today" | "this_month" | "last_month" | "compare_months" | "all";
  appNumbers: string[];
  lastTopicIntent?: KadesIntentType;
}

function reconstructPriorState(priorHistory: AiMessage[]): ReconstructedPriorState {
  const userTurns = priorHistory.filter((m) => m.role === "user");
  const recentUsers = userTurns.slice(-5);

  let statusScope: KadesStatusScope | undefined;
  let serviceScope: "SKTM" | "SP-SKCK" | "BOTH" | undefined;
  const comparedServices: string[] = [];
  let periodScope: "today" | "this_month" | "last_month" | "compare_months" | "all" | undefined;
  let appNumbers: string[] = [];
  let lastTopicIntent: KadesIntentType | undefined;

  for (const turn of recentUsers) {
    const q = turn.content.toLowerCase();
    const standalone = detectStandaloneIntent(q);
    const expStatus = detectExplicitStatus(q);
    const expService = detectExplicitService(q);
    const expApps = extractAppNumbers(turn.content);

    // If a turn switches domain completely (e.g., to users, features, master services, identity), reset stale app filters
    if (
      standalone === "identity_self" ||
      standalone === "identity_user" ||
      standalone === "feature_explanation" ||
      standalone === "master_services" ||
      standalone === "users_roles_demographics" ||
      standalone === "audit_log" ||
      standalone === "bottleneck_analysis"
    ) {
      statusScope = undefined;
      serviceScope = undefined;
      comparedServices.length = 0;
      periodScope = undefined;
      appNumbers = [];
      lastTopicIntent = standalone;
      continue;
    }

    if (standalone) {
      lastTopicIntent = standalone;
    }

    if (q.includes("total seluruh") || q.includes("semua pengajuan")) {
      statusScope = undefined;
      serviceScope = undefined;
      periodScope = undefined;
    }

    if (expStatus) {
      statusScope = expStatus;
    }

    if (expService) {
      serviceScope = expService;
      if (expService === "BOTH") {
        if (!comparedServices.includes("SKTM")) comparedServices.push("SKTM");
        if (!comparedServices.includes("SP-SKCK")) comparedServices.push("SP-SKCK");
      } else if (!comparedServices.includes(expService)) {
        comparedServices.push(expService);
      }
    }

    if (q.includes("bulan lalu") || q.includes("bandingkan dengan bulan")) {
      periodScope = "compare_months";
    } else if (q.includes("bulan ini")) {
      periodScope = "this_month";
    } else if (q.includes("hari ini")) {
      periodScope = "today";
    }

    if (expApps.length > 0) {
      appNumbers = expApps;
    }
  }

  // Also grab PD numbers mentioned in the latest assistant turn if the prior user turn was a filtered query
  if (appNumbers.length === 0 && priorHistory.length > 0) {
    const lastAssistant = [...priorHistory].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      const assistantApps = extractAppNumbers(lastAssistant.content);
      if (assistantApps.length > 0 && (statusScope || lastTopicIntent === "app_list" || lastTopicIntent === "waiting_duration")) {
        appNumbers = assistantApps;
      }
    }
  }

  return {
    statusScope,
    serviceScope,
    comparedServices,
    periodScope,
    appNumbers,
    lastTopicIntent,
  };
}

/**
 * Classifies a Kepala Desa chatbot question with full follow-up context resolution
 * and clean topic-switch detection so unrelated filters never leak across turns.
 */
export function classifyKadesIntent(question: string, rawHistory?: AiMessage[]): KadesClassification {
  const cleanHistory = normalizeConversationHistory(question, rawHistory);
  const prior = reconstructPriorState(cleanHistory);
  const q = question.toLowerCase().trim();

  const explicitApps = extractAppNumbers(question);
  const explicitService = detectExplicitService(q);
  const explicitStatus = detectExplicitStatus(q);
  const standalone = detectStandaloneIntent(q);

  const isComparisonFollowUpPhrase =
    q.includes("bandingkan dengan bulan lalu") ||
    q.includes("bandingkan dengan") ||
    q.startsWith("bagaimana dengan ") ||
    q.includes("kalau ") ||
    q.includes("mana yang lebih banyak") ||
    q.includes("lebih banyak mana");

  const isReferenceFollowUp =
    q.includes("daftar pengajuannya") ||
    q.includes("daftarnya") ||
    q.includes("tampilkan data") ||
    q.includes("datanya") ||
    q.includes("siapa saja nama pemohon") ||
    q.includes("pemohonnya") ||
    q.includes("paling lama menunggu") ||
    q.includes("sudah berapa lama") ||
    q.includes("ringkasannya") ||
    q.includes("kesimpulannya") ||
    q.includes("statusnya") ||
    q.includes("catatannya") ||
    q.includes("kapan diajukan") ||
    q.includes("stafnya") ||
    q.includes("memprosesnya") ||
    q.includes("itu") ||
    q.includes("tadi") ||
    q.includes("tersebut") ||
    isComparisonFollowUpPhrase;

  const isTopicSwitchDomain =
    standalone === "identity_self" ||
    standalone === "identity_user" ||
    standalone === "feature_explanation" ||
    standalone === "master_services" ||
    standalone === "users_roles_demographics" ||
    standalone === "audit_log" ||
    standalone === "app_count_total" ||
    (standalone === "dashboard_overview" && q.includes("dashboard")) ||
    (standalone === "bottleneck_analysis" && !isReferenceFollowUp);

  let intent: KadesIntentType = standalone || "general_help";
  let statusScope: KadesStatusScope | undefined = explicitStatus;
  let serviceScope: "SKTM" | "SP-SKCK" | "BOTH" | undefined = explicitService;
  let comparedServices = [...prior.comparedServices];
  let periodScope: KadesClassification["periodScope"] =
    q.includes("bulan lalu") || q.includes("bandingkan dengan bulan")
      ? "compare_months"
      : q.includes("bulan ini")
      ? "this_month"
      : q.includes("hari ini")
      ? "today"
      : undefined;
  let appNumbers = [...explicitApps];
  let isFollowUp = false;
  let topicSwitched = false;

  if (isTopicSwitchDomain) {
    topicSwitched = cleanHistory.length > 0;
    statusScope = explicitStatus;
    serviceScope = explicitService;
    comparedServices = explicitService ? [explicitService] : [];
  } else if (isComparisonFollowUpPhrase && prior.periodScope) {
    isFollowUp = true;
    periodScope = periodScope || (q.includes("bandingkan") ? "compare_months" : prior.periodScope);
    if (explicitService) {
      serviceScope = explicitService;
      if (!comparedServices.includes(explicitService)) comparedServices.push(explicitService);
    } else if (prior.serviceScope) {
      serviceScope = comparedServices.length > 1 ? "BOTH" : prior.serviceScope;
    }
    if (q.includes("mana yang lebih banyak") || q.includes("lebih banyak mana")) {
      intent = "summary_followup";
      serviceScope = "BOTH";
    } else if (q.startsWith("bagaimana dengan") || q.includes("bulan lalu") || q.includes("bandingkan")) {
      intent = "monthly_comparison";
    }
  } else if (
    (q.includes("ringkasannya") || q.includes("ringkasan data") || q.includes("kesimpulannya")) &&
    !isTopicSwitchDomain
  ) {
    intent = "summary_followup";
    isFollowUp = cleanHistory.length > 0;
    statusScope = statusScope || prior.statusScope;
    serviceScope = serviceScope || (comparedServices.length > 1 ? "BOTH" : prior.serviceScope);
    periodScope = periodScope || prior.periodScope;
    if (appNumbers.length === 0 && !statusScope && !serviceScope) {
      appNumbers = prior.appNumbers;
    }
  } else if (
    (q.includes("tampilkan daftar") || q.includes("tampilkan datanya") || q.includes("daftar pengajuannya") || q.includes("lihat datanya")) &&
    !explicitStatus &&
    !explicitService &&
    explicitApps.length === 0
  ) {
    intent = "app_list";
    isFollowUp = true;
    statusScope = prior.statusScope;
    serviceScope = prior.serviceScope;
    periodScope = prior.periodScope;
    appNumbers = prior.appNumbers;
  } else if (isReferenceFollowUp && !standalone) {
    isFollowUp = true;
    statusScope = prior.statusScope;
    serviceScope = prior.serviceScope;
    periodScope = prior.periodScope;
    appNumbers = prior.appNumbers;
    if (q.includes("siapa") && q.includes("pemohon")) intent = "applicant_identity";
    else if (q.includes("lama") || q.includes("tunggu")) intent = "waiting_duration";
    else if (q.includes("staf") || q.includes("petugas")) intent = "staff_processor";
    else if (appNumbers.length > 0) intent = "specific_application";
    else intent = "app_list";
  } else if (isReferenceFollowUp && standalone && !statusScope && !explicitApps.length) {
    isFollowUp = true;
    statusScope = prior.statusScope;
    if (!serviceScope) serviceScope = prior.serviceScope;
    if (!periodScope) periodScope = prior.periodScope;
    if (appNumbers.length === 0) appNumbers = prior.appNumbers;
  }

  const fourDigitMatch = !appNumbers.length && !q.includes("2026") ? q.match(/\b\d{4}\b/) : null;
  const sortOldestFirst =
    q.includes("paling lama") ||
    q.includes("terlama") ||
    q.includes("berapa lama") ||
    intent === "waiting_duration" ||
    statusScope === "DIAJUKAN";

  const needsUsersRoles =
    intent === "users_roles_demographics" ||
    intent === "staff_processor" ||
    q.includes("warga") ||
    q.includes("role") ||
    q.includes("akun") ||
    q.includes("petugas") ||
    q.includes("staf");

  const needsDashboardMetrics =
    intent === "dashboard_overview" ||
    intent === "app_count_total" ||
    intent === "app_count_service" ||
    intent === "app_status_filter" ||
    statusScope === "APPROVED_DONE" ||
    intent === "service_volume_performance" ||
    intent === "monthly_comparison" ||
    (intent === "summary_followup" && (periodScope === "compare_months" || periodScope === "this_month")) ||
    q.includes("database") ||
    q.includes("data base") ||
    q.includes("gambar") ||
    q.includes("dashboard") ||
    q.includes("angka") ||
    q.includes("statistik") ||
    q.includes("rekap") ||
    q.includes("kartu") ||
    q.includes("fitur");

  const needsApplications =
    intent === "app_count_total" ||
    intent === "app_count_service" ||
    intent === "app_status_filter" ||
    intent === "app_list" ||
    intent === "applicant_identity" ||
    intent === "staff_processor" ||
    intent === "waiting_duration" ||
    intent === "monthly_comparison" ||
    intent === "service_volume_performance" ||
    intent === "bottleneck_analysis" ||
    intent === "dashboard_overview" ||
    intent === "specific_application" ||
    intent === "summary_followup" ||
    q.includes("database") ||
    q.includes("data base") ||
    q.includes("gambar") ||
    q.includes("dashboard") ||
    q.includes("pengajuan") ||
    q.includes("berkas");

  const needsServicesMaster =
    intent === "master_services" ||
    intent === "feature_explanation" ||
    intent === "service_volume_performance" ||
    intent === "bottleneck_analysis";

  return {
    intent,
    statusScope,
    serviceScope,
    comparedServices,
    periodScope,
    appNumbers,
    fourDigitFilter: fourDigitMatch ? fourDigitMatch[0] : undefined,
    sortOldestFirst,
    isFollowUp,
    topicSwitched,
    featureTopic: detectFeatureTopic(q),
    needsDashboardMetrics,
    needsApplications,
    needsStaffHistory: intent === "staff_processor" || intent === "bottleneck_analysis" || intent === "specific_application" || intent === "app_list",
    needsServicesMaster,
    needsUsersRoles,
    needsAuditLogs: intent === "audit_log",
    needsActivities: intent === "service_activities" || intent === "staff_processor",
    needsProfile: intent === "identity_user",
  };
}

/**
 * Queries ONLY the live MySQL database slices needed for the classified Kades intent.
 */
export async function gatherKadesSelectiveContext(params: {
  question: string;
  history?: AiMessage[];
  userId?: string;
  userName?: string;
  userProfile?: UserProfileContext;
  dashboardSummary?: KadesDashboardSummary;
  demographics?: DemographicStatistics;
  auditLogs?: AuditLogSummary;
  activities?: ServiceActivityLog[];
  isDatabaseAvailable: boolean;
}): Promise<KadesSelectiveContextBundle> {
  const classification = classifyKadesIntent(params.question, params.history);
  const now = new Date();
  const nowFormatted = formatIdDate(now, true);

  let applications: KadesLiveApplicationRow[] = [];
  let servicesMaster: KadesLiveServiceMaster[] = [];

  if (params.isDatabaseAvailable) {
    const fetchTasks: Promise<unknown>[] = [];

    if (classification.needsApplications) {
      fetchTasks.push(
        prisma.application
          .findMany({
            include: {
              service: true,
              user: { select: { name: true, email: true, nik: true, phone: true } },
              documents: { select: { requirement_name: true, file_name: true } },
              history: {
                include: { actor: { select: { name: true, role: true } } },
                orderBy: { createdAt: "desc" },
              },
            },
            orderBy: classification.sortOldestFirst ? { submitted_at: "asc" } : { submitted_at: "desc" },
            take: 100,
          })
          .then((rows) => {
            applications = rows.map((app) => {
              const reqs = parseReqs(app.service.requirements);
              const uploadedRequirements = app.documents.map((d) => d.requirement_name);
              const missingRequirements = reqs.filter(
                (r) =>
                  !app.documents.some(
                    (d) =>
                      d.requirement_name.toLowerCase().includes(r.toLowerCase()) ||
                      r.toLowerCase().includes(d.requirement_name.toLowerCase())
                  )
              );

              const diffMs = Math.max(0, now.getTime() - app.submitted_at.getTime());
              const waitingDays = Math.floor(diffMs / 86_400_000);
              const waitingHours = Math.floor(diffMs / 3_600_000);

              const allHistory = app.history.map((h) => ({
                actorName: h.actor?.name || "Sistem",
                actorRole: (h.actor?.role || "WARGA") as Role,
                oldStatus: h.oldStatus,
                newStatus: h.newStatus,
                note: h.note,
                dateFormatted: formatIdDate(h.createdAt, true),
              }));

              const staffProcessors = allHistory.filter((h) => h.actorRole === "STAF" || h.actorRole === "SUPERVISOR" || h.actorRole === "KEPALA_DESA");

              return {
                id: app.id,
                nomor_pengajuan: app.nomor_pengajuan,
                maskedNomorPengajuan: maskNomor(app.nomor_pengajuan),
                serviceCode: app.service.code,
                serviceName: app.service.name,
                estimatedTime: app.service.estimatedTime,
                status: app.status,
                applicantName: app.user.name,
                applicantEmail: app.user.email,
                applicantNik: app.user.nik,
                applicantPhone: app.user.phone,
                submittedAtDate: app.submitted_at,
                updatedAtDate: app.updatedAt,
                submittedAtFormatted: formatIdDate(app.submitted_at, false),
                updatedAtFormatted: formatIdDate(app.updatedAt, true),
                waitingDays,
                waitingHours,
                notes: app.notes,
                latestNote: app.history[0]?.note || app.notes || null,
                staffProcessors,
                allHistory,
                missingRequirements,
                uploadedRequirements,
                detailUrl: `/kades/persetujuan/${app.id}`,
              };
            });
          })
      );
    }

    if (classification.needsServicesMaster) {
      fetchTasks.push(
        prisma.service
          .findMany({
            include: {
              knowledgeDocuments: { where: { isActive: true } },
              _count: { select: { applications: true } },
            },
            orderBy: { name: "asc" },
          })
          .then((rows) => {
            servicesMaster = rows.map((svc) => ({
              id: svc.id,
              code: svc.code,
              name: svc.name,
              description: svc.description,
              estimatedTime: svc.estimatedTime,
              isActive: svc.isActive,
              requirements: parseReqs(svc.requirements),
              applicationCount: svc._count.applications,
              knowledgeDocs: svc.knowledgeDocuments.map((d) => ({
                title: d.title,
                kind: d.kind,
                content: d.content,
              })),
            }));
          })
      );
    }

    await Promise.all(fetchTasks);
  }

  const contextText = buildSelectivePromptContext({
    classification,
    now,
    nowFormatted,
    userName: params.userName || "Budi Santoso",
    userProfile: params.userProfile,
    dashboardSummary: params.dashboardSummary,
    applications,
    servicesMaster,
    demographics: params.demographics,
    auditLogs: params.auditLogs,
    activities: params.activities || [],
  });

  return {
    classification,
    nowFormatted,
    userProfile: params.userProfile,
    dashboardSummary: params.dashboardSummary,
    applications,
    servicesMaster,
    demographics: params.demographics,
    auditLogs: params.auditLogs,
    activities: params.activities || [],
    contextText,
  };
}

function filterApplicationsForScope(
  apps: KadesLiveApplicationRow[],
  classification: KadesClassification
): KadesLiveApplicationRow[] {
  let filtered = apps;

  if (classification.appNumbers.length > 0) {
    const targets = new Set(classification.appNumbers);
    const byNum = filtered.filter((a) => targets.has(a.nomor_pengajuan.toUpperCase()));
    if (byNum.length > 0) filtered = byNum;
  } else if (classification.fourDigitFilter) {
    const byFour = filtered.filter((a) => a.nomor_pengajuan.includes(classification.fourDigitFilter!));
    if (byFour.length > 0) filtered = byFour;
  }

  if (classification.statusScope && classification.appNumbers.length === 0) {
    const scope = classification.statusScope;
    filtered = filtered.filter((a) => {
      if (scope === "PROCESSING_STAF") return a.status === "DIVERIFIKASI" || a.status === "DIPROSES";
      if (scope === "APPROVED_DONE") return a.status === "DISETUJUI" || a.status === "SELESAI";
      if (scope === "VERIFIED_DONE") return a.status === "MENUNGGU_APPROVAL" || a.status === "DISETUJUI" || a.status === "SELESAI";
      if (scope === "ALL_OPEN") return a.status !== "DISETUJUI" && a.status !== "SELESAI" && a.status !== "DITOLAK";
      return a.status === scope;
    });
  }

  if (classification.serviceScope && classification.serviceScope !== "BOTH") {
    filtered = filtered.filter((a) =>
      classification.serviceScope === "SKTM"
        ? a.serviceCode === "SKTM"
        : a.serviceCode === "SP-SKCK" || a.serviceCode === "SKCK"
    );
  }

  return filtered;
}

function getFeatureDocumentationText(topic?: string): string {
  const docs: Record<string, string> = {
    master_layanan:
      "Menu Master Layanan (/kades/layanan) digunakan Kepala Desa untuk mengelola katalog jenis layanan surat desa. Fitur utamanya: (1) Melihat daftar layanan aktif/nonaktif beserta estimasi SLA & deskripsi, (2) Menambah layanan baru (+ Tambah Layanan), (3) Mengedit formulir dinamis (form_schema), daftar persyaratan dokumen, dan estimasi waktu proses, (4) Mengaktifkan/menonaktifkan layanan, serta filter/pencarian kode atau nama layanan.",
    persetujuan:
      "Menu Persetujuan (/kades/persetujuan) adalah meja pengesahan Kepala Desa untuk meninjau permohonan yang sudah diverifikasi staf (status MENUNGGU_APPROVAL), memberikan keputusan resmi (Setujui / Minta Perbaikan / Tolak), serta mengunggah dan mengirim file PDF surat keputusan resmi kepada warga.",
    pengajuan_disetujui:
      "Kartu Pengajuan Disetujui ('Telah disetujui / Selesai', ikon centang hijau) pada bagian Status & Tahapan Pengajuan (/kades/dashboard & /kades/laporan) menampilkan jumlah kumulatif permohonan warga yang telah disetujui Kepala Desa maupun selesai diproses (gabungan status DISETUJUI dan SELESAI), terhubung dengan status pengiriman surat resmi PDF di menu Persetujuan dan perhitungan rata-rata waktu penyelesaian layanan.",
    kelola_user:
      "Menu Kelola User (/kades/users) berfungsi mengelola data kependudukan dan akun pengguna sistem desa (Warga, Staf, Supervisor), mendaftarkan warga baru (+ Tambah Warga Baru), mencari warga berdasarkan nama/NIK 16 digit/email/no HP, serta memantau jumlah berkas per warga dan status aktif akun.",
    laporan:
      "Menu Laporan (/kades/laporan) menampilkan rekapitulasi statistik pelayanan desa berdasarkan periode, jenis layanan (SKTM/SKCK), dan distribusi seluruh status tahapan pengajuan (DIAJUKAN, PERLU_PERBAIKAN, MENUNGGU_APPROVAL, DISETUJUI, DITOLAK) untuk evaluasi kinerja.",
    audit_log:
      "Menu Audit Log (/kades/audit) merekam jejak aktivitas penting pada sistem secara kronologis (login, pembuatan/perubahan data, aksi persetujuan, entitas, ID, dan aktor pelaksana) untuk akuntabilitas eksekutif Kepala Desa & Supervisor.",
    dashboard:
      "Menu Dashboard Utama (/kades/dashboard) menyajikan ringkasan pemantauan real-time pelayanan SKTM dan Surat Pengantar Pembuatan SKCK dalam 3 bagian: (1) Total Pengajuan Berdasarkan Layanan (Total Pengajuan SKTM, Total Pengajuan SKCK, Total Seluruh Pengajuan), (2) Status & Tahapan Pengajuan (Menunggu Verifikasi [DIAJUKAN], Sedang Diproses Staf [DIPROSES], Menunggu Persetujuan [APPROVAL], Pengajuan Disetujui, Pengajuan Ditolak), dan (3) Statistik Volume Layanan serta Performa Penyelesaian Layanan (Rata-rata Waktu Proses).",
    profil:
      "Menu Profil Saya (/profil) digunakan untuk melihat dan memperbarui data diri akun Kepala Desa (nama, NIK, email terverifikasi, nomor WhatsApp, alamat, tanggal bergabung), mengganti kata sandi (Keamanan), dan memeriksa ringkasan informasi akun.",
    notifikasi:
      "Menu Notifikasi (/kades/notifikasi) menampilkan pemberitahuan berkas siap tanda tangan, pengajuan yang menunggu keputusan Kepala Desa, dan tautan cepat ke halaman detail persetujuan.",
    asisten_ai:
      "Menu Asisten AI Eksekutif (/kades/asisten) dan widget mengambang Asisten Eksekutif Kades membantu Kepala Desa memeriksa data database real-time, status antrean, verifikasi staf, demografi warga, audit log, dan analisis performa melalui tanya-jawab interaktif.",
  };

  if (topic && docs[topic]) {
    return docs[topic];
  }

  return Object.values(docs).join("\n- ");
}

function shortenNote(note: string | null | undefined, maxLen = 55): string {
  if (!note) return "-";
  const trimmed = note.trim();
  if (!trimmed) return "-";
  if (trimmed.includes("mengunggah dan mengirimkan dokumen resmi Surat Pelayanan (PDF)")) {
    return "PDF surat resmi terkirim ke warga";
  }
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}...` : trimmed;
}

function buildAppCompactLine(a: KadesLiveApplicationRow, idx: number, includeStaff = false): string {
  const stafText = includeStaff
    ? (() => {
        const stafActs = a.allHistory.filter((h) => h.actorRole !== "WARGA");
        if (stafActs.length === 0) return " | Petugas: Belum ada verifikasi staf";
        const keyActs = stafActs
          .filter((h) => !(h.oldStatus === "DISETUJUI" && h.newStatus === "DISETUJUI"))
          .slice(0, 2);
        const displayActs = keyActs.length > 0 ? keyActs : stafActs.slice(0, 2);
        return (
          " | Petugas: " +
          displayActs
            .map((h) => `${h.actorName} [${h.actorRole}] (${h.oldStatus || "AWAL"}->${h.newStatus}, ${h.dateFormatted}${h.note ? `, "${shortenNote(h.note, 35)}"` : ""})`)
            .join("; ")
        );
      })()
    : "";

  const slaDays = parseSlaDays(a.estimatedTime);
  const slaNote = slaDays !== null && a.waitingDays > slaDays ? ` [LEWAT SLA ${slaDays}h]` : "";
  const shortService = a.serviceCode === "SP-SKCK" ? "SP-SKCK" : a.serviceCode === "SKTM" ? "SKTM" : a.serviceName;

  return `${idx + 1}. ${a.nomor_pengajuan} | ${shortService} | ${a.status} | Pemohon: ${a.applicantName} | Diajukan: ${a.submittedAtFormatted} (tunggu ${a.waitingDays}h${slaNote}) | Catatan: "${shortenNote(a.latestNote, 50)}"${stafText}`;
}

function buildMonthlyComparisonData(apps: KadesLiveApplicationRow[], now: Date) {
  const thisY = now.getFullYear();
  const thisM = now.getMonth();
  const lastDate = new Date(thisY, thisM - 1, 1);
  const lastY = lastDate.getFullYear();
  const lastM = lastDate.getMonth();
  const thisMonthLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const lastMonthLabel = lastDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const inMonth = (d: Date, y: number, m: number) => d.getFullYear() === y && d.getMonth() === m;
  const isSktm = (a: KadesLiveApplicationRow) => a.serviceCode === "SKTM";
  const isSkck = (a: KadesLiveApplicationRow) => a.serviceCode === "SP-SKCK" || a.serviceCode === "SKCK";

  const thisAll = apps.filter((a) => inMonth(a.submittedAtDate, thisY, thisM));
  const lastAll = apps.filter((a) => inMonth(a.submittedAtDate, lastY, lastM));
  const thisSktm = thisAll.filter(isSktm);
  const lastSktm = lastAll.filter(isSktm);
  const thisSkck = thisAll.filter(isSkck);
  const lastSkck = lastAll.filter(isSkck);
  const totalSkck = apps.filter(isSkck).length;
  const totalSktm = apps.filter(isSktm).length;

  const describeDelta = (label: string, curr: number, prev: number) => {
    const diff = curr - prev;
    if (diff > 0) return `${label}: NAIK +${diff} berkas (${curr} di ${thisMonthLabel} vs ${prev} di ${lastMonthLabel})`;
    if (diff < 0) return `${label}: TURUN ${diff} berkas (${curr} di ${thisMonthLabel} vs ${prev} di ${lastMonthLabel})`;
    return `${label}: SAMA (${curr} berkas di kedua bulan)`;
  };

  const leaderAll =
    totalSkck > totalSktm
      ? `SKCK LEBIH BANYAK daripada SKTM (${totalSkck} vs ${totalSktm})`
      : totalSktm > totalSkck
      ? `SKTM LEBIH BANYAK daripada SKCK (${totalSktm} vs ${totalSkck})`
      : `SKCK dan SKTM SAMA BANYAK (${totalSkck} vs ${totalSktm})`;

  return {
    thisMonthLabel,
    lastMonthLabel,
    thisAll,
    lastAll,
    summaryLines: [
      `Perbandingan Pengajuan Bulanan (Dihitung Langsung Dari submitted_at di Database):`,
      `- Bulan Berjalan (${thisMonthLabel}): Total ${thisAll.length} berkas (SKCK: ${thisSkck.length}, SKTM: ${thisSktm.length})`,
      `- Bulan Lalu (${lastMonthLabel}): Total ${lastAll.length} berkas (SKCK: ${lastSkck.length}, SKTM: ${lastSktm.length})`,
      `- Akumulasi Keseluruhan: Total ${apps.length} berkas (SKCK: ${totalSkck}, SKTM: ${totalSktm})`,
      `- Arah Perubahan Bulanan (WAJIB IKUTI PERSIS): ${describeDelta("Total", thisAll.length, lastAll.length)}; ${describeDelta("SKCK", thisSkck.length, lastSkck.length)}; ${describeDelta("SKTM", thisSktm.length, lastSktm.length)}`,
      `- Perbandingan Antar-Layanan (SKCK vs SKTM): ${leaderAll} (Bulan ini: SKCK=${thisSkck.length} vs SKTM=${thisSktm.length}; Bulan lalu: SKCK=${lastSkck.length} vs SKTM=${lastSktm.length}).`,
    ],
  };
}

function buildSelectivePromptContext(input: {
  classification: KadesClassification;
  now: Date;
  nowFormatted: string;
  userName: string;
  userProfile?: UserProfileContext;
  dashboardSummary?: KadesDashboardSummary;
  applications: KadesLiveApplicationRow[];
  servicesMaster: KadesLiveServiceMaster[];
  demographics?: DemographicStatistics;
  auditLogs?: AuditLogSummary;
  activities: ServiceActivityLog[];
}): string {
  const { classification: cls, now, nowFormatted, dashboardSummary: dash, applications: apps } = input;
  const lines: string[] = [
    `[KONTEKS TERFILTER OTOMATIS BERDASARKAN INTENT: ${cls.intent}]`,
    `Waktu Server Saat Ini: ${nowFormatted} (Asia/Jakarta)`,
  ];

  if (cls.isFollowUp) {
    lines.push(
      `Konteks Lanjutan Aktif: statusScope=${cls.statusScope || "NONE"}, serviceScope=${cls.serviceScope || "NONE"}, periodScope=${cls.periodScope || "NONE"}, appNumbers=${cls.appNumbers.join(",") || "NONE"}`
    );
  }

  switch (cls.intent) {
    case "identity_self":
      lines.push(
        `Identitas Asisten: Saya adalah Asisten AI Eksekutif Kepala Desa pada Sistem Pelayanan Desa Digital yang membantu Bapak ${input.userName} memantau data pengajuan surat (SKTM & SP-SKCK), kinerja staf, warga/role terdaftar, master layanan, kendala, laporan, dan audit log berdasarkan database resmi.`
      );
      break;

    case "identity_user":
      if (input.userProfile) {
        lines.push(
          `Data Akun Pengguna Aktif (Tabel users):`,
          `- Nama: ${input.userProfile.name}`,
          `- Role / Jabatan: ${input.userProfile.role}`,
          `- NIK: ${input.userProfile.nik || "-"}`,
          `- Email: ${input.userProfile.email} (${input.userProfile.emailVerified || "Terverifikasi"})`,
          `- No HP/WA: ${input.userProfile.phone || "-"}`,
          `- Alamat: ${input.userProfile.address || "-"}`,
          `- Bergabung: ${input.userProfile.createdAt}`,
          `- Status Akun: ${input.userProfile.isActive ? "AKTIF" : "NONAKTIF"}`
        );
      } else {
        lines.push(`Pengguna Aktif: ${input.userName} (Role: KEPALA_DESA).`);
      }
      break;

    case "feature_explanation":
      lines.push(`Dokumentasi Fitur Resmi Aplikasi:\n${getFeatureDocumentationText(cls.featureTopic)}`);
      if (cls.featureTopic === "master_layanan" && input.servicesMaster.length > 0) {
        lines.push(
          `Layanan Terkonfigurasi di Master Layanan Saat Ini: ` +
            input.servicesMaster.map((s) => `${s.code} (${s.name}, SLA: ${s.estimatedTime || "-"}, Status: ${s.isActive ? "Aktif" : "Nonaktif"})`).join("; ")
        );
      }
      lines.push(`INSTRUKSI: Jelaskan fungsi fitur/menu tersebut secara spesifik. Jangan menyertakan statistik jumlah pengajuan dashboard jika tidak diminta.`);
      break;

    case "master_services":
      if (input.servicesMaster.length === 0) {
        lines.push("Belum ada layanan terdaftar pada tabel services.");
      } else {
        lines.push(`Daftar Master Layanan Aktual (${input.servicesMaster.length} layanan di database):`);
        input.servicesMaster.forEach((s, i) => {
          lines.push(
            `${i + 1}. [${s.code}] ${s.name} | Status: ${s.isActive ? "Aktif" : "Nonaktif"} | Estimasi SLA: ${s.estimatedTime || "-"} | Deskripsi: ${s.description || "-"} | Syarat: ${s.requirements.join(", ") || "-"} | Total Pengajuan Masuk: ${s.applicationCount}`
          );
        });
      }
      break;

    case "users_roles_demographics":
      if (input.demographics) {
        const d = input.demographics;
        const roleSummary = Object.entries(d.usersByRole)
          .map(([r, c]) => `${r}: ${c} akun`)
          .join(", ");
        lines.push(
          `Data Pengguna & Role Sistem (Tabel users, total ${d.totalUsers} akun): ${roleSummary}`,
          `Total Warga Terdaftar (Role WARGA): ${d.totalWarga} orang (Laki-laki: ${d.wargaByGender["Laki-laki"] || 0}, Perempuan: ${d.wargaByGender["Perempuan"] || 0})`
        );
        if (d.systemUsers && d.systemUsers.length > 0) {
          lines.push(
            `Rincian Akun Per Role:\n` +
              d.systemUsers.map((u, i) => `  ${i + 1}. ${u.name} | Role: ${u.role} | Email: ${u.email} | Status: ${u.isActive ? "Aktif" : "Nonaktif"}`).join("\n")
          );
        }
        if (d.wargaFullList && d.wargaFullList.length > 0) {
          lines.push(
            `Rincian Warga:\n` +
              d.wargaFullList.map((w, i) => `  ${i + 1}. ${w.name} (${w.gender}) | Pengajuan: ${w.totalApplications} berkas`).join("\n")
          );
        }
      }
      break;

    case "audit_log":
      if (input.auditLogs && input.auditLogs.logs.length > 0) {
        lines.push(`Audit Log Terbaru (${input.auditLogs.logs.length} entri terakhir dari tabel audit_logs):`);
        input.auditLogs.logs.slice(0, 12).forEach((l, i) => {
          lines.push(`${i + 1}. [${l.time}] Aktor: ${l.actorName} (${l.actorRole}) | Aksi: ${l.action} | Entitas: ${l.entity}${l.entityId ? ` #${l.entityId}` : ""}`);
        });
      } else {
        lines.push("Belum ada catatan audit log yang ditemukan.");
      }
      break;

    case "service_activities":
      if (input.activities.length > 0) {
        lines.push(`Riwayat Aktivitas Proses Pelayanan Terbaru (${input.activities.length} entri):`);
        input.activities.slice(0, 10).forEach((act, i) => {
          lines.push(`${i + 1}. [${act.date}] ${act.applicationNumber} (${act.serviceName}) | Aktor: ${act.actorName} (${act.actorRole}) | ${act.oldStatus || "AWAL"} -> ${act.newStatus}${act.note ? ` | "${act.note}"` : ""}`);
        });
      } else {
        lines.push("Belum ada riwayat aktivitas pelayanan.");
      }
      break;

    case "staff_processor": {
      const stafUsers = input.demographics?.systemUsers?.filter((u) => u.role === "STAF" || u.role === "SUPERVISOR" || u.role === "KEPALA_DESA") || [];
      const actorSet = new Set<string>(stafUsers.map((u) => `${u.name} (${u.role})`));
      if (actorSet.size === 0) {
        for (const a of apps) {
          for (const h of a.allHistory) {
            if (h.actorRole && h.actorRole !== "WARGA") {
              actorSet.add(`${h.actorName} (${h.actorRole})`);
            }
          }
        }
      }
      const hasScopedTarget = Boolean(cls.statusScope || cls.appNumbers.length > 0 || cls.fourDigitFilter);
      const scopedTarget = hasScopedTarget ? filterApplicationsForScope(apps, cls) : [];
      const scopedUntouchedByStaff =
        hasScopedTarget &&
        scopedTarget.length > 0 &&
        scopedTarget.every((a) => !a.allHistory.some((h) => h.actorRole === "STAF"));

      if (hasScopedTarget && scopedTarget.length > 0) {
        lines.push(`Rincian Pemrosesan Staf Pada Berkas Konteks Aktif (${scopedTarget.length} berkas):`);
        scopedTarget.slice(0, 12).forEach((a, i) => lines.push(buildAppCompactLine(a, i, true)));
      }

      if (scopedUntouchedByStaff) {
        lines.push(
          `STATUS PEMROSESAN STAF PADA BERKAS KONTEKS AKTIF: BELUM ADA Staf Desa yang memproses atau memverifikasi ${scopedTarget.length} berkas tersebut (seluruhnya masih berstatus awal / DIAJUKAN).`,
          `Kesimpulan Wajib: Sampaikan secara jelas bahwa belum ada Staf Desa yang memproses atau memverifikasi pengajuan tersebut karena masih dalam antrean menunggu verifikasi awal.`
        );
        break;
      }

      lines.push(
        `Referensi Daftar Aparatur Terdaftar di Sistem (hanya daftar akun, BUKAN berarti sudah memproses berkas antrean awal): ${Array.from(actorSet).join(", ") || "Belum ada catatan tindakan aparatur"}`
      );
      const staffHandledApps = apps.filter((a) => a.allHistory.some((h) => h.actorRole === "STAF"));
      const untouchedByStaffApps = apps.filter((a) => !a.allHistory.some((h) => h.actorRole === "STAF"));
      lines.push(
        `Ringkasan Pemrosesan Staf dari ${apps.length} Pengajuan (application_histories):`,
        `- Sudah ditangani Staf: ${staffHandledApps.length} berkas`,
        `- Belum ditangani Staf: ${untouchedByStaffApps.length} berkas (${untouchedByStaffApps.map((a) => `${a.nomor_pengajuan}:${a.status}`).join(", ") || "-"})`
      );
      if (!hasScopedTarget) {
        const prioritizedApps = [...staffHandledApps.slice(0, 3), ...untouchedByStaffApps.slice(0, 1)];
        lines.push(`Sampel Tindakan Staf (Prioritas Ditangani Staf):`);
        prioritizedApps.forEach((a, i) => lines.push(buildAppCompactLine(a, i, true)));
      }
      break;
    }

    case "monthly_comparison": {
      const mc = buildMonthlyComparisonData(apps, now);
      lines.push(
        ...mc.summaryLines,
        `- Catatan Wajib Perbandingan: Selalu cantumkan angka eksplisit KEDUA periode (${mc.thisMonthLabel} DAN ${mc.lastMonthLabel}) beserta arah perubahan yang benar (NAIK/TURUN) untuk layanan yang sedang dibahas (${cls.serviceScope || "SKCK/SKTM/Total"}).`
      );
      if (mc.thisAll.length > 0) {
        lines.push(`Berkas Masuk ${mc.thisMonthLabel}: ${mc.thisAll.map((a) => `${a.nomor_pengajuan} [${a.serviceCode}, ${a.applicantName}, ${a.submittedAtFormatted}, ${a.status}]`).join("; ")}`);
      }
      if (mc.lastAll.length > 0) {
        lines.push(`Berkas Masuk ${mc.lastMonthLabel}: ${mc.lastAll.map((a) => `${a.nomor_pengajuan} [${a.serviceCode}, ${a.status}]`).join("; ")}`);
      }
      break;
    }

    case "bottleneck_analysis": {
      const pendingVerify = apps.filter((a) => a.status === "DIAJUKAN");
      const needRepair = apps.filter((a) => a.status === "PERLU_PERBAIKAN");
      const needApproval = apps.filter((a) => a.status === "MENUNGGU_APPROVAL");
      const inProcess = apps.filter((a) => a.status === "DIVERIFIKASI" || a.status === "DIPROSES");
      const slaBreached = apps.filter((a) => {
        if (a.status === "DISETUJUI" || a.status === "SELESAI" || a.status === "DITOLAK") return false;
        const sla = parseSlaDays(a.estimatedTime);
        return sla !== null && a.waitingDays > sla;
      });
      const incompleteDocs = apps.filter((a) => a.missingRequirements.length > 0 && a.status !== "DISETUJUI" && a.status !== "SELESAI");

      lines.push(
        `Analisis Kendala Pelayanan Aktual Dari Database (Total ${apps.length} berkas):`,
        `1. Berkas Belum Diverifikasi Staf (DIAJUKAN): ${pendingVerify.length} berkas`,
        `2. Berkas Dikembalikan / Perlu Perbaikan (PERLU_PERBAIKAN): ${needRepair.length} berkas`,
        `3. Berkas Menunggu Persetujuan Kades (MENUNGGU_APPROVAL): ${needApproval.length} berkas`,
        `4. Berkas Sedang Diproses Staf: ${inProcess.length} berkas`,
        `5. Berkas Terindikasi Melewati Target SLA (${input.servicesMaster.map((s) => `${s.code}:${s.estimatedTime}`).join(", ")}): ${slaBreached.length} berkas`
      );
      if (pendingVerify.length > 0) {
        lines.push(`Rincian Antrean DIAJUKAN:\n` + pendingVerify.map((a, i) => buildAppCompactLine(a, i, false)).join("\n"));
      }
      if (needRepair.length > 0) {
        lines.push(`Rincian Berkas PERLU_PERBAIKAN:\n` + needRepair.map((a, i) => buildAppCompactLine(a, i, true)).join("\n"));
      }
      if (incompleteDocs.length > 0) {
        lines.push(
          `Dokumen Kurang: ` + incompleteDocs.map((a) => `${a.nomor_pengajuan} kurang [${a.missingRequirements.join(", ")}]`).join("; ")
        );
      }
      break;
    }

    case "app_count_total":
    case "app_count_service":
    case "app_status_filter":
    case "app_list":
    case "applicant_identity":
    case "waiting_duration":
    case "specific_application":
    case "summary_followup": {
      const scoped = filterApplicationsForScope(apps, cls);
      const countByStatus = (list: KadesLiveApplicationRow[]) => {
        const counts: Record<string, number> = {
          DIAJUKAN: 0,
          DIVERIFIKASI: 0,
          DIPROSES: 0,
          REVIEW_SUPERVISOR: 0,
          MENUNGGU_APPROVAL: 0,
          DISETUJUI: 0,
          SELESAI: 0,
          PERLU_PERBAIKAN: 0,
          DITOLAK: 0,
        };
        for (const a of list) counts[a.status] = (counts[a.status] || 0) + 1;
        return counts;
      };

      const totalStatusCounts = countByStatus(apps);
      const scopedStatusCounts = countByStatus(scoped);
      const totalSktm = apps.filter((a) => a.serviceCode === "SKTM").length;
      const totalSkck = apps.filter((a) => a.serviceCode === "SP-SKCK" || a.serviceCode === "SKCK").length;

      lines.push(
        `Ringkasan Database Pengajuan Aktual: Total Keseluruhan=${apps.length} (SKTM=${totalSktm}, SP-SKCK=${totalSkck})`,
        `Distribusi 9 Status Global: ` + Object.entries(totalStatusCounts).map(([k, v]) => `${k}=${v}`).join(", ") +
          (cls.intent === "app_status_filter" && !cls.statusScope
            ? `\nCatatan Wajib: Bila ditanya jumlah/rekap/distribusi berdasarkan status, tampilkan KESEMUA 9 kode status di atas persis termasuk yang bernilai 0 (khususnya MENUNGGU_APPROVAL, DIVERIFIKASI, DIPROSES, REVIEW_SUPERVISOR, SELESAI, DITOLAK).`
            : "")
      );

      if (cls.statusScope === "APPROVED_DONE") {
        const approvedTotal = totalStatusCounts.DISETUJUI + totalStatusCounts.SELESAI;
        const approvedSktm = scoped.filter((a) => a.serviceCode === "SKTM").length;
        const approvedSkck = scoped.filter((a) => a.serviceCode === "SP-SKCK" || a.serviceCode === "SKCK").length;
        const avgDays = dash?.performance.averageCompletionDays;
        lines.push(
          `INSTRUKSI WAJIB: Pertanyaan merujuk pada KARTU FITUR DI DASHBOARD: PENGAJUAN DISETUJUI ("Telah disetujui / Selesai" | Ikon Centang Hijau). JANGAN PERNAH menolak dengan alasan tidak bisa melihat gambar atau meminta pengguna mengirim file gambar, karena data database resmi untuk kartu tersebut SUDAH LENGKAP disediakan di bawah ini. Langsung bacakan angka utama kartu, formula status, rincian per layanan, status surat resmi, performa, dan rincian berkasnya secara jelas dan ramah kepada Kepala Desa.`,
          `PEMBACAAN KHUSUS KARTU FITUR DASHBOARD — PENGAJUAN DISETUJUI ("Telah disetujui / Selesai" | Ikon Centang Hijau):`,
          `- Judul & Subjudul Kartu di Dashboard: **PENGAJUAN DISETUJUI** — "Telah disetujui / Selesai"`,
          `- Angka Utama Kartu di Dashboard: **${approvedTotal}**`,
          `- Formula Status Resmi Database: Gabungan status DISETUJUI (${totalStatusCounts.DISETUJUI} berkas) + SELESAI (${totalStatusCounts.SELESAI} berkas) = **${approvedTotal} berkas**`,
          `- Rincian Berdasarkan Layanan: SKTM = ${approvedSktm} berkas | SP-SKCK = ${approvedSkck} berkas`,
          ...(dash
            ? [
                `- Status Surat Resmi (Menu Persetujuan): Surat Resmi Terkirim = ${dash.sentLetterCount ?? approvedTotal} berkas | Disetujui Belum Kirim Surat = ${dash.pendingLetterCount ?? 0} berkas`,
                `- Kontribusi Performa (${dash.performance.completedSample} berkas selesai): Rata-rata Waktu Proses = ${avgDays !== null && avgDays !== undefined ? `${avgDays.toFixed(1)} hari kerja` : "Belum ada sampel"}`,
              ]
            : [])
        );
      }

      if (cls.periodScope === "compare_months" || (cls.intent === "summary_followup" && cls.periodScope)) {
        const mc = buildMonthlyComparisonData(apps, now);
        lines.push(...mc.summaryLines);
        if (cls.serviceScope === "BOTH") {
          lines.push(
            `- Fokus Lanjutan Antar-Layanan: Pengguna menanyakan perbandingan antar kedua layanan yang dibahas; WAJIB sebut dan bandingkan langsung **SKCK** vs **SKTM** berdasarkan angka aktual di atas.`
          );
        }
      }

      const sortedScoped = [...scoped].sort((a, b) =>
        cls.sortOldestFirst
          ? a.submittedAtDate.getTime() - b.submittedAtDate.getTime()
          : b.submittedAtDate.getTime() - a.submittedAtDate.getTime()
      );

      const statusScopeLabelMap: Record<KadesStatusScope, string> = {
        DIAJUKAN:
          "DIAJUKAN = Belum Diverifikasi / Menunggu Verifikasi Staf (PENTING: pertanyaan 'belum diverifikasi' merujuk ke status DIAJUKAN, BUKAN DIVERIFIKASI)",
        DIVERIFIKASI: "DIVERIFIKASI = Sudah Diverifikasi Staf",
        DIPROSES: "DIPROSES = Sedang Disiapkan Berkas Oleh Staf",
        PROCESSING_STAF:
          "DIVERIFIKASI atau DIPROSES = Sedang Diproses Staf (CATATAN: berbeda dengan DIAJUKAN yang merupakan antrean menunggu verifikasi)",
        VERIFIED_DONE: "MENUNGGU_APPROVAL / DISETUJUI / SELESAI = Sudah Diverifikasi",
        MENUNGGU_APPROVAL: "MENUNGGU_APPROVAL = Menunggu Persetujuan Kepala Desa",
        DISETUJUI: "DISETUJUI = Disetujui Kepala Desa",
        APPROVED_DONE: "DISETUJUI atau SELESAI = Sudah Disetujui / Selesai",
        PERLU_PERBAIKAN: "PERLU_PERBAIKAN = Perlu Perbaikan",
        DITOLAK: "DITOLAK = Ditolak",
        REVIEW_SUPERVISOR: "REVIEW_SUPERVISOR = Review Supervisor",
        SELESAI: "SELESAI = Selesai",
        ALL_OPEN: "Pengajuan Aktif Belum Selesai",
      };
      const activeScopeLabel = cls.statusScope ? statusScopeLabelMap[cls.statusScope] : undefined;

      lines.push(
        `${activeScopeLabel ? `Fokus Status Aktif (${activeScopeLabel}) | ` : ""}Data Pengajuan Cocok Filter (${sortedScoped.length} berkas | Status: ${Object.entries(scopedStatusCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(", ") || "Nihil"}):`
      );
      if (sortedScoped.length === 0) {
        lines.push(
          activeScopeLabel
            ? `(0 berkas — Tidak ada pengajuan pada kategori ${activeScopeLabel}. WAJIB jawab tepat **0 berkas**; DILARANG menggantinya dengan angka status lain seperti DIAJUKAN=${totalStatusCounts.DIAJUKAN} atau PERLU_PERBAIKAN=${totalStatusCounts.PERLU_PERBAIKAN}.)`
            : "(Tidak ada berkas yang cocok dengan kriteria filter saat ini.)"
        );
      } else {
        const isPureStatusOverview =
          cls.intent === "app_status_filter" &&
          !cls.statusScope &&
          !cls.periodScope &&
          cls.appNumbers.length === 0 &&
          !cls.fourDigitFilter &&
          !cls.applicantQuery;
        const limit = isPureStatusOverview ? 4 : 12;
        sortedScoped.slice(0, limit).forEach((a, i) => lines.push(buildAppCompactLine(a, i, cls.needsStaffHistory)));
      }
      break;
    }

    case "service_volume_performance": {
      const totalSktm = apps.filter((a) => a.serviceCode === "SKTM").length;
      const totalSkck = apps.filter((a) => a.serviceCode === "SP-SKCK" || a.serviceCode === "SKCK").length;
      const completed = apps.filter((a) => a.status === "DISETUJUI" || a.status === "SELESAI");
      const needRepair = apps.filter((a) => a.status === "PERLU_PERBAIKAN").length;
      const avgDays = dash?.performance.averageCompletionDays;
      lines.push(
        `Volume Layanan & Performa Aktual (${apps.length} berkas):`,
        `- Surat Pengantar Pembuatan SKCK: ${totalSkck} berkas (${apps.length > 0 ? Math.round((totalSkck / apps.length) * 100) : 0}%)`,
        `- Surat Keterangan Tidak Mampu (SKTM): ${totalSktm} berkas (${apps.length > 0 ? Math.round((totalSktm / apps.length) * 100) : 0}%)`,
        `- Target SLA Terdaftar: ${input.servicesMaster.map((s) => `${s.code} (${s.estimatedTime || "-"})`).join(", ") || "SP-SKCK (1 Hari Kerja), SKTM (2 Hari Kerja)"}`,
        `- Sampel Berkas Selesai/Disetujui: ${completed.length} berkas (${apps.length > 0 ? Math.round((completed.length / apps.length) * 100) : 0}%) | Perlu Perbaikan: ${needRepair} berkas`,
        `- Rata-rata Waktu Penyelesaian Aktual: ${avgDays !== null && avgDays !== undefined ? `${avgDays.toFixed(1)} hari kerja` : "Belum ada sampel selesai"}`
      );
      break;
    }

    case "dashboard_overview":
    default:
      if (dash) {
        const avgStr = dash.performance.averageCompletionDays !== null ? `${dash.performance.averageCompletionDays.toFixed(1)} hari kerja` : "Belum ada sampel";
        const volumeStr = dash.serviceStats.length > 0
          ? dash.serviceStats.map((s) => `${s.name}: ${s.count} berkas`).join(" | ")
          : "Belum ada data layanan";
        lines.push(
          `INSTRUKSI WAJIB: Data database operasional desa SUDAH tersedia lengkap di bawah. Langsung tampilkan laporannya kepada Kepala Desa (jangan menolak dengan alasan gambar/database dan jangan meminta pengguna mengirim gambar/data apa pun).`,
          `PEMBACAAN LENGKAP FITUR DASHBOARD UTAMA KEPALA DESA (Formula Resmi Database Aktual):`,
          `[A] TOTAL PENGAJUAN BERDASARKAN LAYANAN (3 Kartu):`,
          `1. Total Pengajuan SKTM (Surat Keterangan Tidak Mampu): ${dash.totalSktm} berkas`,
          `2. Total Pengajuan SKCK (Surat Pengantar Pembuatan SKCK): ${dash.totalSkck} berkas`,
          `3. Total Seluruh Pengajuan (Akumulasi seluruh layanan desa): ${dash.total} berkas`,
          `[B] STATUS & TAHAPAN PENGAJUAN (5 Kartu):`,
          `1. Menunggu Verifikasi (Antrean Staf / DIAJUKAN): ${dash.menungguVerifikasi} berkas`,
          `2. Sedang Diproses Staf (Penyiapan berkas / DIVERIFIKASI + DIPROSES): ${dash.sedangDiproses} berkas`,
          `3. Menunggu Persetujuan (Meja Kepala Desa / MENUNGGU_APPROVAL): ${dash.menungguPersetujuan} berkas`,
          `4. Pengajuan Disetujui (Telah disetujui / Selesai — DISETUJUI + SELESAI): ${dash.disetujui} berkas`,
          `5. Pengajuan Ditolak (Tidak memenuhi persyaratan / DITOLAK): ${dash.ditolak} berkas`,
          `[C] GRAFIK & PERFORMA DASHBOARD (2 Panel):`,
          `1. Statistik Volume Layanan: ${volumeStr}`,
          `2. Performa Penyelesaian Layanan — Rata-rata Waktu Proses: ${avgStr} (Dihitung dari ${dash.performance.completedSample} pengajuan selesai)`,
          `[D] DATA TAMBAHAN DATABASE TERKAIT:`,
          `- Perlu Perbaikan (PERLU_PERBAIKAN): ${dash.perluPerbaikan} berkas | Surat Resmi Terkirim: ${dash.sentLetterCount ?? dash.disetujui} | Belum Kirim Surat: ${dash.pendingLetterCount ?? 0}`,
          `- **Data Pelayanan Hari Ini:** (${dash.today.date}): ${dash.today.totalSubmittedToday} pengajuan baru masuk Hari Ini, ${dash.today.totalApprovedToday} disetujui Hari Ini`,
          `- CATATAN KONTEKS: WAJIB langsung sajikan pembacaan fitur Dashboard Utama secara urut satu per satu dan jelas untuk seluruh 3 bagian di atas ([A] Total Pengajuan Berdasarkan Layanan beserta 3 kartunya, [B] Status & Tahapan Pengajuan beserta 5 kartunya, dan [C] Statistik Volume Layanan & Performa Penyelesaian Layanan), serta WAJIB sertakan judul label tepat "**Data Pelayanan Hari Ini:**" (huruf H dan I pada "Hari Ini" wajib kapital), plus rincian eksplisit **SKTM** (${dash.totalSktm} berkas), **SKCK** (${dash.totalSkck} berkas), **Menunggu Verifikasi (DIAJUKAN)** (${dash.menungguVerifikasi} berkas), dan **Pengajuan Disetujui** (${dash.disetujui} berkas). Saat menyebut nomor pengajuan di bawah, wajib cocokkan kode Status= masing-masing baris.`
        );
      }
      if (apps.length > 0) {
        lines.push(
          `Sampel ${Math.min(apps.length, 4)} Pengajuan Terbaru (HANYA sampel, DILARANG mengarang nomor PD di luar daftar ini; baca Status= masing-masing baris dengan tepat):`
        );
        apps.slice(0, 4).forEach((a, i) => lines.push(buildAppCompactLine(a, i, false)));
      }
      break;
  }

  return lines.join("\n");
}
