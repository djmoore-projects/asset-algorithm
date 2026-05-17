import { google, calendar_v3 } from "googleapis";

// ─── OAuth2 Setup ───────────────────────────────────────────────────────────

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

/** Generate the Google OAuth consent URL for a user. */
export function getAuthUrl(state?: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: state || "",
  });
}

/** Exchange an authorization code for tokens. */
export async function exchangeCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** Get an authenticated Calendar client using stored tokens. */
export function getCalendarClient(tokens: {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number | null;
}): calendar_v3.Calendar {
  const client = getOAuth2Client();
  client.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: client });
}

/** Refresh tokens if expired and return new tokens. */
export async function refreshTokensIfNeeded(tokens: {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number | null;
}): Promise<typeof tokens> {
  if (!tokens.expiry_date || tokens.expiry_date > Date.now() + 60_000) {
    return tokens;
  }

  const client = getOAuth2Client();
  client.setCredentials(tokens);
  const { credentials } = await client.refreshAccessToken();
  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token || tokens.refresh_token,
    expiry_date: credentials.expiry_date,
  };
}

// ─── Availability Config ───────────────────────────────────────────────────

const AVAILABILITY = {
  startHour: 12,       // 12pm ET
  endHour: 17,         // 5pm ET
  timeZone: "America/New_York",
  maxMeetingsPerDay: 4,
  bufferMinutes: 30,   // 30 min buffer between meetings
};

// ─── Calendar Operations ────────────────────────────────────────────────────

export interface BookingParams {
  summary: string;
  description?: string;
  startTime: string; // ISO 8601
  durationMinutes?: number;
  attendeeEmail?: string;
  location?: string;
  meetingUrl?: string;
  timeZone?: string;
}

/** Create a calendar event and return the event details. */
export async function createCalendarEvent(
  tokens: { access_token: string; refresh_token?: string | null; expiry_date?: number | null },
  params: BookingParams
): Promise<calendar_v3.Schema$Event> {
  const freshTokens = await refreshTokensIfNeeded(tokens);
  const calendar = getCalendarClient(freshTokens);

  const duration = params.durationMinutes || 30;
  const start = new Date(params.startTime);
  const end = new Date(start.getTime() + duration * 60_000);
  const tz = params.timeZone || AVAILABILITY.timeZone;

  const event: calendar_v3.Schema$Event = {
    summary: params.summary,
    description: params.description || "",
    start: { dateTime: start.toISOString(), timeZone: tz },
    end: { dateTime: end.toISOString(), timeZone: tz },
    conferenceData: params.meetingUrl
      ? undefined
      : {
          createRequest: {
            requestId: `aa-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
    location: params.meetingUrl || params.location || undefined,
    attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    conferenceDataVersion: params.meetingUrl ? 0 : 1,
    sendUpdates: params.attendeeEmail ? "all" : "none",
  });

  return res.data;
}

/**
 * Convert a Date to a specific timezone by using Intl formatting.
 * Returns an object with local hour, minute, and a Date set to midnight local.
 */
function getLocalTime(date: Date, tz: string): { hour: number; minute: number; dayKey: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  return {
    hour: get("hour") === 24 ? 0 : get("hour"),
    minute: get("minute"),
    dayKey: `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`,
  };
}

/** Count existing meetings on a given day from busy slots. */
function countMeetingsOnDay(
  dayKey: string,
  busySlots: calendar_v3.Schema$TimePeriod[],
  tz: string
): number {
  return busySlots.filter((busy) => {
    const local = getLocalTime(new Date(busy.start!), tz);
    return local.dayKey === dayKey;
  }).length;
}

/** Get free/busy info to find available slots respecting availability rules. */
export async function getAvailableSlots(
  tokens: { access_token: string; refresh_token?: string | null; expiry_date?: number | null },
  options: {
    startDate: string; // ISO date
    endDate: string;
    durationMinutes?: number;
    timeZone?: string;
  }
): Promise<{ start: string; end: string }[]> {
  const freshTokens = await refreshTokensIfNeeded(tokens);
  const calendar = getCalendarClient(freshTokens);

  const tz = options.timeZone || AVAILABILITY.timeZone;
  const duration = options.durationMinutes || 30;
  const { startHour, endHour, maxMeetingsPerDay, bufferMinutes } = AVAILABILITY;

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: new Date(options.startDate).toISOString(),
      timeMax: new Date(options.endDate).toISOString(),
      timeZone: tz,
      items: [{ id: "primary" }],
    },
  });

  const busySlots = res.data.calendars?.primary?.busy || [];

  // Also fetch actual events to count meetings per day accurately
  const eventsRes = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date(options.startDate).toISOString(),
    timeMax: new Date(options.endDate).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  const existingEvents = eventsRes.data.items || [];

  // Count meetings per day from existing events
  const meetingsPerDay: Record<string, number> = {};
  for (const event of existingEvents) {
    if (!event.start?.dateTime) continue; // skip all-day events
    const local = getLocalTime(new Date(event.start.dateTime), tz);
    meetingsPerDay[local.dayKey] = (meetingsPerDay[local.dayKey] || 0) + 1;
  }

  // Track how many new slots we've added per day
  const newSlotsPerDay: Record<string, number> = {};

  // Track all blocked periods: existing events + accepted slots (with buffers)
  const blockedPeriods = busySlots.map((busy) => ({
    start: new Date(busy.start!).getTime(),
    end: new Date(busy.end!).getTime(),
  }));

  const slots: { start: string; end: string }[] = [];
  const current = new Date(options.startDate);
  const endDate = new Date(options.endDate);

  while (current < endDate) {
    const dayOfWeek = current.getDay();
    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const localDay = getLocalTime(current, tz);
      const dayKey = localDay.dayKey;

      const existingCount = meetingsPerDay[dayKey] || 0;
      const addedCount = () => newSlotsPerDay[dayKey] || 0;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min = 0; min < 60; min += 30) {
          // Check if we've hit the daily cap
          if (existingCount + addedCount() >= maxMeetingsPerDay) break;

          const slotLocalStr = `${dayKey}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
          const slotStart = zonedToUtc(slotLocalStr, tz);
          const slotEnd = new Date(slotStart.getTime() + duration * 60_000);

          // Ensure slot ends within availability window
          const slotEndLocal = getLocalTime(slotEnd, tz);
          if (slotEndLocal.hour > endHour || (slotEndLocal.hour === endHour && slotEndLocal.minute > 0)) continue;

          // Check overlap with all blocked periods (existing events + accepted slots, with buffer)
          const slotStartMs = slotStart.getTime();
          const slotEndMs = slotEnd.getTime();

          const hasConflict = blockedPeriods.some((blocked) => {
            // Slot must be at least bufferMinutes away from any blocked period
            const bufferMs = bufferMinutes * 60_000;
            return slotStartMs < (blocked.end + bufferMs) && slotEndMs > (blocked.start - bufferMs);
          });

          if (!hasConflict) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
            });
            newSlotsPerDay[dayKey] = addedCount() + 1;

            // Block this slot so future candidates respect the buffer
            blockedPeriods.push({ start: slotStartMs, end: slotEndMs });
          }
        }
        // Break out of hour loop too if daily cap reached
        if (existingCount + (newSlotsPerDay[dayKey] || 0) >= maxMeetingsPerDay) break;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Convert a local time string (YYYY-MM-DDTHH:mm:ss) in a given timezone to a UTC Date.
 */
function zonedToUtc(localDateStr: string, tz: string): Date {
  // Use a binary search approach: create a UTC date and adjust
  // by comparing what Intl says the local time is
  const naive = new Date(localDateStr + "Z"); // treat as UTC initially
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Get the offset by checking what local time a known UTC date produces
  const testUtc = naive.getTime();
  const parts = formatter.formatToParts(new Date(testUtc));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  const localHour = get("hour") === 24 ? 0 : get("hour");
  const localMinute = get("minute");
  const localDay = get("day");

  // Parse the target
  const targetHour = parseInt(localDateStr.slice(11, 13), 10);
  const targetMinute = parseInt(localDateStr.slice(14, 16), 10);
  const targetDay = parseInt(localDateStr.slice(8, 10), 10);

  // Calculate offset in ms
  const diffMs =
    ((localDay - targetDay) * 24 * 60 + (localHour - targetHour) * 60 + (localMinute - targetMinute)) * 60_000;

  return new Date(testUtc - diffMs);
}

/** Delete a calendar event. */
export async function deleteCalendarEvent(
  tokens: { access_token: string; refresh_token?: string | null; expiry_date?: number | null },
  eventId: string
): Promise<void> {
  const freshTokens = await refreshTokensIfNeeded(tokens);
  const calendar = getCalendarClient(freshTokens);
  await calendar.events.delete({ calendarId: "primary", eventId });
}
