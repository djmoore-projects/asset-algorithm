import { NextRequest, NextResponse } from "next/server";
import { verifyTwilioSignature } from "@/lib/security";

/**
 * Strip XML/SSML tags from a string to prevent SSML injection.
 */
function stripXmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Validate that a string looks like a plausible phone number.
 * Allows digits, +, -, spaces, and parentheses only.
 */
function isValidPhoneNumber(str: string): boolean {
  return /^[\d\s+\-()]+$/.test(str) && str.replace(/\D/g, "").length >= 7;
}

export async function POST(req: NextRequest) {
  // Verify Twilio signature
  const body = await req.text();
  const params: Record<string, string> = {};
  new URLSearchParams(body).forEach((v, k) => { params[k] = v; });
  const isValid = await verifyTwilioSignature(req, params);
  if (!isValid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawScript = searchParams.get("script");
  const rawForwardTo = searchParams.get("forward_to");

  // Sanitize inputs
  const script = rawScript ? stripXmlTags(rawScript) : null;
  const forwardTo = rawForwardTo && isValidPhoneNumber(rawForwardTo) ? rawForwardTo : null;

  let twiml: string;

  if (script) {
    // Automated message delivery
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(script)}</Say>
  <Pause length="2"/>
  <Say voice="Polly.Matthew">If you'd like to speak with someone, please stay on the line.</Say>
  ${forwardTo ? `<Dial>${escapeXml(forwardTo)}</Dial>` : '<Hangup/>'}
</Response>`;
  } else if (forwardTo) {
    // Direct bridge call
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || ''}">
    <Number>${escapeXml(forwardTo)}</Number>
  </Dial>
</Response>`;
  } else {
    // Default: simple connection
    // Nothing should reach this branch: automated calling is disabled and
    // prospect calls are dialed by a person. If a stray call lands here, end
    // it immediately rather than leaving someone holding on silence.
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
  }

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Also handle GET for Twilio
export async function GET(req: NextRequest) {
  // Verify Twilio signature for GET requests too
  const isValid = await verifyTwilioSignature(req, {});
  if (!isValid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawScript = searchParams.get("script");
  const rawForwardTo = searchParams.get("forward_to");

  const script = rawScript ? stripXmlTags(rawScript) : null;
  const forwardTo = rawForwardTo && isValidPhoneNumber(rawForwardTo) ? rawForwardTo : null;

  let twiml: string;

  if (script) {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(script)}</Say>
  <Pause length="2"/>
  <Say voice="Polly.Matthew">If you'd like to speak with someone, please stay on the line.</Say>
  ${forwardTo ? `<Dial>${escapeXml(forwardTo)}</Dial>` : '<Hangup/>'}
</Response>`;
  } else if (forwardTo) {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || ''}">
    <Number>${escapeXml(forwardTo)}</Number>
  </Dial>
</Response>`;
  } else {
    // Nothing should reach this branch: automated calling is disabled and
    // prospect calls are dialed by a person. If a stray call lands here, end
    // it immediately rather than leaving someone holding on silence.
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
  }

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
