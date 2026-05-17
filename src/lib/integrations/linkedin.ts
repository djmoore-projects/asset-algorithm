// LinkedIn automation helpers
// LinkedIn API has strict rate limits and ToS restrictions.
// This module provides helper utilities for LinkedIn outreach tracking.

export function validateLinkedInUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(url);
}

export function extractProfileSlug(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([\w-]+)/);
  return match ? match[1] : null;
}

export function buildProfileUrl(slug: string): string {
  return `https://www.linkedin.com/in/${slug}`;
}

export function buildMessageUrl(profileSlug: string): string {
  return `https://www.linkedin.com/messaging/compose/?recipient=${profileSlug}`;
}

export function generateConnectionNote({
  recipientName, recipientCompany, senderName, context,
}: {
  recipientName: string; recipientCompany?: string; senderName: string; context?: string;
}): string {
  const firstName = recipientName.split(" ")[0];
  let note = `Hi ${firstName}, `;
  note += recipientCompany
    ? `I came across ${recipientCompany} and was impressed by what you've built. `
    : `I came across your profile and wanted to connect. `;
  if (context) note += context + " ";
  note += `Would love to connect and learn more. - ${senderName}`;
  return note.length > 300 ? note.slice(0, 297) + "..." : note;
}
