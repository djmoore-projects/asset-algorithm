import twilio from "twilio";

let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) throw new Error("Twilio credentials not configured");
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export async function sendSMS({ to, body, from }: { to: string; body: string; from?: string }) {
  const client = getTwilioClient();
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER not configured");
  const message = await client.messages.create({ body, from: fromNumber, to });
  return { sid: message.sid, status: message.status, to: message.to, from: message.from };
}

/**
 * Places an automated outbound call.
 *
 * Disabled for cold outreach. Two reasons, and either one is enough:
 * an artificial voice pitching an acquisition gets hung up on, and the TCPA
 * requires prior express written consent before a prerecorded or artificial
 * voice reaches a mobile number. Cold prospects have given no such consent.
 *
 * Nothing calls this today. Prospect calls get dialed by a person reading the
 * generated script. Wiring it back up means gating it to contacts with
 * recorded consent, so the guard stays until that exists.
 */
export async function initiateCall({ to, from, record }: { to: string; from?: string; record?: boolean }) {
  if (process.env.ENABLE_AUTOMATED_CALLS !== "true") {
    throw new Error(
      "Automated calling is disabled. Prospect calls are dialed manually using the generated script."
    );
  }

  const client = getTwilioClient();
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER not configured");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const call = await client.calls.create({
    to, from: fromNumber, url: `${appUrl}/api/outreach/call/twiml`,
    statusCallback: `${appUrl}/api/webhooks?provider=twilio-call`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    record: record ?? true,
  });
  return { sid: call.sid, status: call.status, to: call.to, from: call.from };
}
