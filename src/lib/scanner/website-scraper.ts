/**
 * Website scraper that fetches the homepage + about/contact pages
 * to maximize chances of finding owner names and contact info.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Patterns for links to about/contact/team pages
const CONTACT_PAGE_PATTERNS = [
  /\/about/i,
  /\/contact/i,
  /\/team/i,
  /\/our-team/i,
  /\/our-story/i,
  /\/who-we-are/i,
  /\/leadership/i,
  /\/staff/i,
  /\/people/i,
  /\/meet-the-team/i,
  /\/meet-us/i,
  /\/owners?/i,
  /\/founder/i,
  /\/bio/i,
];

/**
 * Scrape a business website: homepage + any about/contact/team pages.
 * Returns combined text from all pages, or null on failure.
 */
export async function scrapeWebsiteText(url: string): Promise<string | null> {
  try {
    // Normalize URL
    let baseUrl = url;
    if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;

    // 1. Fetch homepage
    const homepageHtml = await fetchPage(baseUrl);
    if (!homepageHtml) return null;

    const homepageText = extractTextFromHTML(homepageHtml);

    // 2. Find about/contact/team page links from homepage
    const subPageUrls = discoverContactPages(homepageHtml, baseUrl);

    // 3. Fetch subpages in parallel (max 3, with short timeout)
    const subPageTexts: string[] = [];
    if (subPageUrls.length > 0) {
      const fetches = subPageUrls.slice(0, 3).map(async (subUrl) => {
        try {
          const html = await fetchPage(subUrl);
          if (html) {
            const label = subUrl.replace(baseUrl, "").replace(/^\//, "") || "subpage";
            return `\n--- ${label} page ---\n${extractTextFromHTML(html)}`;
          }
        } catch {}
        return null;
      });

      const results = await Promise.all(fetches);
      for (const r of results) {
        if (r) subPageTexts.push(r);
      }
    }

    // 4. Also try common paths if we didn't find them in links
    const triedUrls = new Set(subPageUrls);
    const commonPaths = ["/about", "/about-us", "/contact", "/our-team", "/team"];
    const fallbackUrls: string[] = [];

    for (const path of commonPaths) {
      const fullUrl = new URL(path, baseUrl).href;
      if (!triedUrls.has(fullUrl)) {
        fallbackUrls.push(fullUrl);
        triedUrls.add(fullUrl);
      }
    }

    // Only try fallback paths if we didn't find any subpages from links
    if (subPageTexts.length === 0 && fallbackUrls.length > 0) {
      const fallbackFetches = fallbackUrls.slice(0, 3).map(async (fbUrl) => {
        try {
          const html = await fetchPage(fbUrl);
          if (html) {
            const label = fbUrl.replace(baseUrl, "").replace(/^\//, "");
            return `\n--- ${label} page ---\n${extractTextFromHTML(html)}`;
          }
        } catch {}
        return null;
      });

      const results = await Promise.all(fallbackFetches);
      for (const r of results) {
        if (r) subPageTexts.push(r);
      }
    }

    // 5. Combine all text
    let combined = `--- homepage ---\n${homepageText}`;
    for (const sp of subPageTexts) {
      combined += sp;
    }

    // Truncate for AI (generous limit for multi-page)
    return combined.slice(0, 8000) || null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single page with realistic browser headers.
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Discover about/contact/team page links from the homepage HTML.
 */
function discoverContactPages(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Extract all <a href="..."> links
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (!href) continue;

    // Check if this link matches contact page patterns
    const matchesPattern = CONTACT_PAGE_PATTERNS.some((p) => p.test(href));
    if (!matchesPattern) continue;

    // Also check anchor text for relevance
    try {
      let fullUrl: string;
      if (href.startsWith("http")) {
        // Only follow same-domain links
        const linkDomain = new URL(href).hostname;
        const baseDomain = new URL(baseUrl).hostname;
        if (linkDomain !== baseDomain) continue;
        fullUrl = href;
      } else if (href.startsWith("/")) {
        fullUrl = new URL(href, baseUrl).href;
      } else {
        fullUrl = new URL(href, baseUrl).href;
      }

      // Deduplicate
      const normalized = fullUrl.replace(/\/$/, "").toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      urls.push(fullUrl);
    } catch {
      // Invalid URL — skip
    }
  }

  return urls;
}

/**
 * Extract readable text from HTML, keeping structure.
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "");

  // Extract mailto: and tel: links before stripping tags
  const emails: string[] = [];
  const phones: string[] = [];
  const mailtoRegex = /href=["']mailto:([^"'?]+)/gi;
  const telRegex = /href=["']tel:([^"']+)/gi;

  let m: RegExpExecArray | null;
  while ((m = mailtoRegex.exec(text)) !== null) {
    if (m[1]) emails.push(m[1]);
  }
  while ((m = telRegex.exec(text)) !== null) {
    if (m[1]) phones.push(m[1]);
  }

  // Replace common block elements with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(
    /<\/?(p|div|h[1-6]|li|tr|td|th|section|article|footer|blockquote)[^>]*>/gi,
    "\n"
  );

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n");
  text = text.trim();

  // Append extracted mailto/tel data so AI can always see them
  if (emails.length > 0 || phones.length > 0) {
    text += "\n\n--- Extracted from HTML links ---";
    if (emails.length > 0) text += `\nEmail addresses found: ${[...new Set(emails)].join(", ")}`;
    if (phones.length > 0) text += `\nPhone numbers found: ${[...new Set(phones)].join(", ")}`;
  }

  // Per-page limit (will be combined across pages)
  return text.slice(0, 3000);
}
