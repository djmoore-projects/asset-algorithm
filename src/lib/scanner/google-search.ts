/**
 * Use Google search snippets to find business owner information
 * when website scraping doesn't yield contact details.
 *
 * Uses the simple "site:" and "owner" search heuristic via
 * Google's Custom Search JSON API (or falls back to scraping
 * a Google search results page if no CSE key is configured).
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Search Google for business owner/contact information.
 * Returns text snippets that can be fed to AI for extraction.
 */
export async function searchForOwnerInfo(
  businessName: string,
  location: string | null
): Promise<string | null> {
  try {
    // Build search queries
    const queries = [
      `"${businessName}" owner`,
      `"${businessName}" founder`,
      `"${businessName}" ${location || ""} owner contact`,
    ];

    const allSnippets: string[] = [];

    for (const query of queries.slice(0, 2)) {
      const snippets = await googleSearchSnippets(query);
      if (snippets) {
        allSnippets.push(...snippets);
      }
      if (allSnippets.length >= 5) break;
    }

    if (allSnippets.length === 0) return null;

    // Deduplicate and combine
    const unique = [...new Set(allSnippets)];
    return unique.join("\n").slice(0, 2000);
  } catch {
    return null;
  }
}

/**
 * Fetch Google search results and extract snippets.
 * Uses a simple HTML scrape of Google search (no API key needed).
 */
async function googleSearchSnippets(query: string): Promise<string[]> {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5&hl=en`;

    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();

    // Extract text snippets from Google's search results
    const snippets: string[] = [];

    // Google wraps snippets in various elements — extract text between result blocks
    // Remove scripts and styles first
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");

    // Find snippet-like text blocks (usually in <span> or <div> near result links)
    // Look for BNeawe (Google's snippet class) or data-sncf attributes
    const snippetRegex =
      /<(?:span|div)[^>]*class="[^"]*(?:BNeawe|IsZvec|VwiC3b)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/gi;

    let match: RegExpExecArray | null;
    while ((match = snippetRegex.exec(cleaned)) !== null) {
      const text = match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (text.length > 20 && text.length < 500) {
        snippets.push(text);
      }
    }

    // Fallback: if regex didn't catch them, try a broader extraction
    if (snippets.length === 0) {
      // Extract all visible text blocks between result dividers
      const textBlocks = cleaned
        .replace(/<[^>]+>/g, "\n")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 30 && l.length < 500);

      // Look for lines mentioning owner/founder/contact keywords
      const ownerKeywords = /owner|founder|ceo|president|principal|contact|established by|started by|created by/i;
      for (const line of textBlocks) {
        if (ownerKeywords.test(line)) {
          snippets.push(line);
        }
      }
    }

    return snippets.slice(0, 5);
  } catch {
    return [];
  }
}
