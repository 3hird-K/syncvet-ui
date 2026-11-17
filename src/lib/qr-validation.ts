import { format, isValid } from "date-fns";
import type { CVOFieldOperation } from "@/data/cvo-store";
import { getFieldOpGracePeriod } from "@/lib/utils";

/**
 * The two QR families used by the platform. They are deliberately separate:
 *  - "queue"     -> Today's Clinic Queue check-in station (`/queue-checkin`)
 *  - "field-op"  -> Barangay Field Operation attendance poster (`/outreach-checkin`)
 *
 * "appointment" is an appointment-pass QR (JSON payload) which belongs to the
 * clinic queue flow because it books a slot at the Carmen Clinic.
 */
export type QrCodeKind = "queue" | "field-op" | "appointment" | "unknown";

export interface ParsedQrCode {
  kind: QrCodeKind;
  raw: string;
  url: URL | null;
  date: string | null;
  station: string | null;
  opId: string | null;
  appointmentId: string | null;
}

export interface QrValidation {
  valid: boolean;
  kind: QrCodeKind;
  title: string;
  description: string;
}

const FALLBACK_ORIGIN = "https://syncvet.cagayan-de-oro.gov.ph";

function cleanDate(value?: string | null): string | null {
  if (!value) return null;
  const clean = value.includes("T") ? value.split("T")[0] : value.trim();
  return clean || null;
}

function matchParam(raw: string, key: string): string | null {
  const match = raw.match(new RegExp(`[?&]${key}=([^&]+)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function safeUrl(raw: string): URL | null {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN;
    return new URL(raw, base);
  } catch {
    return null;
  }
}

/**
 * Classifies a decoded QR payload. Anything that is not a recognised clinic
 * queue / appointment / field operation code is reported as "unknown" so the
 * caller can reject it instead of silently routing it to a check-in flow.
 */
export function parseQrCode(decodedText: string): ParsedQrCode {
  const raw = (decodedText || "").trim();
  const base: ParsedQrCode = {
    kind: "unknown",
    raw,
    url: null,
    date: null,
    station: null,
    opId: null,
    appointmentId: null,
  };
  if (!raw) return base;

  // Appointment pass QR codes are JSON payloads identifying an exact booking.
  try {
    const payload = JSON.parse(raw);
    if (
      payload &&
      typeof payload === "object" &&
      typeof payload.appointmentId === "string" &&
      payload.appointmentId
    ) {
      return {
        ...base,
        kind: "appointment",
        appointmentId: payload.appointmentId,
        date: cleanDate(typeof payload.date === "string" ? payload.date : null),
      };
    }
  } catch {
    // Not JSON — continue with URL parsing.
  }

  const url = /^(https?:\/\/|\/)/i.test(raw) ? safeUrl(raw) : null;
  const search = url?.searchParams;
  const date = cleanDate(search?.get("date") || matchParam(raw, "date"));
  const station = search?.get("station") || matchParam(raw, "station");
  const opId = search?.get("opId") || matchParam(raw, "opId");
  const appointmentId = search?.get("appointmentId") || matchParam(raw, "appointmentId");
  const path = url?.pathname || raw;
  const type = (search?.get("type") || "").toLowerCase();

  const isFieldOp =
    path.includes("outreach-checkin") ||
    path.includes("outreach-attendance") ||
    type.includes("outreach") ||
    /[?&]type=outreach/i.test(raw);

  const isQueue =
    path.includes("queue-checkin") ||
    type.includes("queue") ||
    Boolean(station) ||
    Boolean(search?.get("token")?.startsWith("cvo-queue")) ||
    Boolean(appointmentId);

  const kind: QrCodeKind = isFieldOp ? "field-op" : isQueue ? "queue" : "unknown";

  return { ...base, kind, url, date, station, opId, appointmentId };
}

export function formatQrDate(dateStr: string): string {
  const clean = cleanDate(dateStr);
  if (!clean) return "";
  try {
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
      if (isValid(parsed)) return format(parsed, "MMMM d, yyyy");
    }
  } catch {
    // Fall back to the raw value.
  }
  return clean;
}

/**
 * Validates a QR against the Today's Clinic Queue flow. Field operation QR
 * codes are rejected so a barangay attendance poster can never be used to
 * join the clinic queue.
 */
export function validateQueueQr(parsed: ParsedQrCode, todayStr: string): QrValidation {
  if (parsed.kind === "field-op") {
    return {
      valid: false,
      kind: parsed.kind,
      title: "Field Operation QR Detected",
      description:
        "This is a Barangay Outreach attendance QR code, not a clinic queue QR. It cannot be scanned to join Today's Clinic Queue. Please scan the clinic reception check-in QR standee instead.",
    };
  }

  if (parsed.kind !== "queue" && parsed.kind !== "appointment") {
    return {
      valid: false,
      kind: parsed.kind,
      title: "Invalid Clinic Check-in QR",
      description:
        "This does not appear to be an official CVO Clinic Queue check-in QR code. Please scan the QR code displayed at the clinic reception desk.",
    };
  }

  if (parsed.date && parsed.date !== todayStr) {
    return {
      valid: false,
      kind: parsed.kind,
      title: parsed.date > todayStr ? "Check-in QR Not Yet Active" : "Expired Check-in QR",
      description: `This clinic check-in QR was generated for ${formatQrDate(
        parsed.date
      )} and is valid on that day only. Please scan today's active station QR code at the clinic reception desk.`,
    };
  }

  return { valid: true, kind: parsed.kind, title: "", description: "" };
}

/**
 * Validates a QR against the Field Operations attendance flow. Clinic queue QR
 * codes and codes that do not belong to a real, currently-running field
 * operation schedule are rejected.
 */
export function validateFieldOpQr(
  parsed: ParsedQrCode,
  todayStr: string,
  fieldOperations: CVOFieldOperation[]
): QrValidation {
  if (parsed.kind === "queue" || parsed.kind === "appointment") {
    return {
      valid: false,
      kind: parsed.kind,
      title: "Clinic Queue QR Detected",
      description:
        "This is a clinic queue check-in QR code, not a field operation QR. It cannot be scanned to record Barangay Outreach attendance. Please scan the outreach attendance poster instead.",
    };
  }

  if (parsed.kind !== "field-op") {
    return {
      valid: false,
      kind: parsed.kind,
      title: "Invalid Attendance QR",
      description:
        "This does not appear to be an official CVO Field Operation attendance QR code. Please scan the attendance poster provided by the outreach team.",
    };
  }

  if (!parsed.opId) {
    return {
      valid: false,
      kind: parsed.kind,
      title: "Missing Outreach Reference",
      description:
        "This attendance QR code does not include a field operation reference, so attendance cannot be verified.",
    };
  }

  const matchedOp = fieldOperations.find(
    (op) => op.opId === parsed.opId || op.id === parsed.opId
  );

  if (!matchedOp) {
    return {
      valid: false,
      kind: parsed.kind,
      title: "No Matching Field Operation",
      description:
        "This attendance QR code is not linked to any scheduled field operation. Attendance cannot be recorded with this code.",
    };
  }

  const cleanOpDate = cleanDate(matchedOp.date) || "";

  if (parsed.date && cleanOpDate && parsed.date !== cleanOpDate) {
    return {
      valid: false,
      kind: parsed.kind,
      title: "Attendance QR Does Not Match Schedule",
      description: `This QR code was generated for ${formatQrDate(
        parsed.date
      )}, but ${matchedOp.opId} is scheduled for ${formatQrDate(
        cleanOpDate
      )}. Please scan the correct attendance poster.`,
    };
  }

  if (cleanOpDate !== todayStr) {
    return {
      valid: false,
      kind: parsed.kind,
      title: cleanOpDate > todayStr ? "Attendance QR Not Yet Active" : "Expired Attendance QR",
      description:
        cleanOpDate > todayStr
          ? `This attendance QR is for the ${matchedOp.opId} outreach scheduled on ${formatQrDate(
              cleanOpDate
            )}. It becomes valid on that day only.`
          : `The ${matchedOp.opId} outreach concluded on ${formatQrDate(
              cleanOpDate
            )}. Attendance QR codes are no longer valid.`,
    };
  }

  const grace = getFieldOpGracePeriod(matchedOp.date, matchedOp.status);
  if (
    grace.isPastGracePeriod ||
    matchedOp.status === "completed" ||
    matchedOp.status === "cancelled"
  ) {
    return {
      valid: false,
      kind: parsed.kind,
      title: "Expired Outreach QR Code",
      description: `The field operation in Barangay ${matchedOp.barangay} has concluded. Attendance QR codes are no longer valid.`,
    };
  }

  return { valid: true, kind: parsed.kind, title: "", description: "" };
}
