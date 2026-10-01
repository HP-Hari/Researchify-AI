import * as cheerio from "cheerio";

export type SourceTier = "tier1" | "tier2" | "tier3" | "tier4";

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  domain?: string | undefined;
  tier?: SourceTier | undefined;
  tierLabel?: string | undefined;
  authorityScore?: number | undefined;
  sourceType?: string | undefined;
  estimatedYear?: string | undefined;
};

export function extractYearFromText(text: string): string | undefined {
  const match = text.match(/\b(202[0-7]|201\d)\b/);
  return match ? match[1] : undefined;
}

export function classifySourceTier(urlStr: string): {
  tier: SourceTier;
  tierLabel: string;
  authorityScore: number;
  sourceType: string;
} {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();

    // Tier 1: Regulatory, Academic, Government, Official Research
    if (
      host.endsWith(".gov") ||
      host.endsWith(".edu") ||
      host.includes("sec.gov") ||
      host.includes("arxiv.org") ||
      host.includes("nih.gov") ||
      host.includes("ftc.gov") ||
      host.includes("fda.gov") ||
      host.includes("europa.eu") ||
      host.includes("worldbank.org") ||
      host.includes("imf.org") ||
      host.includes("nature.com") ||
      host.includes("science.org")
    ) {
      return {
        tier: "tier1",
        tierLabel: "Regulatory / Peer-Reviewed",
        authorityScore: 95,
        sourceType: "Official Regulatory / Academic Repository",
      };
    }

    // Tier 2: Institutional Financial & Strategic Market Intelligence
    if (
      host.includes("bloomberg.com") ||
      host.includes("reuters.com") ||
      host.includes("wsj.com") ||
      host.includes("ft.com") ||
      host.includes("mckinsey.com") ||
      host.includes("bain.com") ||
      host.includes("gartner.com") ||
      host.includes("statista.com") ||
      host.includes("economist.com") ||
      host.includes("forbes.com") ||
      host.includes("hbr.org") ||
      host.includes("spglobal.com")
    ) {
      return {
        tier: "tier2",
        tierLabel: "Institutional Market Analyst",
        authorityScore: 85,
        sourceType: "Institutional Financial / Market Intelligence",
      };
    }

    // Tier 3: Specialized Tech & Industry Press
    if (
      host.includes("techcrunch.com") ||
      host.includes("theverge.com") ||
      host.includes("wired.com") ||
      host.includes("cnbc.com") ||
      host.includes("arstechnica.com") ||
      host.includes("venturebeat.com") ||
      host.includes("mit.edu") ||
      host.includes("technologyreview.com")
    ) {
      return {
        tier: "tier3",
        tierLabel: "Specialized Industry Press",
        authorityScore: 70,
        sourceType: "Specialized Industry & Technology Press",
      };
    }

    return {
      tier: "tier4",
      tierLabel: "Verified Web Source",
      authorityScore: 50,
      sourceType: "General Industry / Web Source",
    };
  } catch {
    return {
      tier: "tier4",
      tierLabel: "Verified Web Source",
      authorityScore: 50,
      sourceType: "General Industry / Web Source",
    };
  }
}

export async function searchWeb(
  query: string,
  limit: number = 5,
  recency?: "day" | "week" | "month" | "year",
): Promise<{ query: string; results: SearchHit[] }> {
  try {
    const encoded = encodeURIComponent(query);
    const dfMap: Record<string, string> = {
      day: "d",
      week: "w",
      month: "m",
      year: "y",
    };
    const df = recency && dfMap[recency] ? `&df=${dfMap[recency]}` : "";
    const url = `https://html.duckduckgo.com/html/?q=${encoded}${df}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`Search request failed with status ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchHit[] = [];

    $(".result__body").each((_, el) => {
      if (results.length >= limit) return;

      const titleEl = $(el).find(".result__title");
      const title = titleEl.text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      const rawHref =
        $(el).find(".result__url").attr("href") ||
        titleEl.find("a").attr("href") ||
        "";

      let cleanUrl = rawHref;
      try {
        if (cleanUrl.includes("uddg=")) {
          const parsed = new URL(cleanUrl, "https://duckduckgo.com");
          const uddg = parsed.searchParams.get("uddg");
          if (uddg) cleanUrl = decodeURIComponent(uddg);
        }
      } catch {
        // keep rawHref if URL parsing fails
      }

      if (title && cleanUrl) {
        // Final validation: only accept proper http(s) URLs, skip DuckDuckGo internal links
        cleanUrl = cleanUrl.trim();
        try {
          const validated = new URL(cleanUrl);
          if (
            (validated.protocol === "http:" || validated.protocol === "https:") &&
            !validated.hostname.includes("duckduckgo.com")
          ) {
            const { tier, tierLabel, authorityScore, sourceType } = classifySourceTier(cleanUrl);
            const estimatedYear = extractYearFromText(title + " " + snippet + " " + cleanUrl);
            results.push({
              title,
              url: cleanUrl,
              snippet: snippet || title,
              domain: validated.hostname.replace(/^www\./, ""),
              tier,
              tierLabel,
              authorityScore,
              sourceType,
              estimatedYear,
            });
          }
        } catch {
          // Skip invalid URLs entirely
        }
      }
    });

    return { query, results };
  } catch (error) {
    console.error("Web search error:", error);
    return { query, results: [] };
  }
}

export async function readPage(url: string): Promise<{ url: string; title: string; content: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").text().trim() || url;
    $("script, style, nav, footer, header, noscript, iframe, svg").remove();
    const content = $("body").text().replace(/\s+/g, " ").trim().slice(0, 10000);
    return { url, title, content };
  } catch (error) {
    console.error("Page scrape error:", error);
    return { url, title: url, content: "" };
  }
}
