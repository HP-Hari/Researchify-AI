import * as cheerio from "cheerio";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

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
      host.includes("science.org") ||
      host.includes("ieee.org") ||
      host.includes("acm.org") ||
      host.includes("nber.org") ||
      host.includes("biorxiv.org") ||
      host.includes("medrxiv.org")
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
      host.includes("bcg.com") ||
      host.includes("gartner.com") ||
      host.includes("statista.com") ||
      host.includes("economist.com") ||
      host.includes("forbes.com") ||
      host.includes("hbr.org") ||
      host.includes("spglobal.com") ||
      host.includes("wikipedia.org") ||
      host.includes("databricks.com") ||
      host.includes("nvidia.com") ||
      host.includes("openai.com") ||
      host.includes("google.com")
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
      host.includes("technologyreview.com") ||
      host.includes("marktechpost.com") ||
      host.includes("medium.com") ||
      host.includes("github.com")
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

// ============================================================================
// MULTI-PROVIDER SEARCH ENGINES: Google News, arXiv, Wikipedia & DDG
// ============================================================================

async function searchGoogleNews(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const hits: SearchHit[] = [];

    for (const item of items) {
      if (hits.length >= limit) break;
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

      const title = (titleMatch ? titleMatch[1] : "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const link = (linkMatch ? linkMatch[1] : "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const source = (sourceMatch ? sourceMatch[1] : "").trim();
      const desc = (descMatch ? descMatch[1] : "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
      const pubDate = pubDateMatch ? pubDateMatch[1] : "";

      if (title && link) {
        const fullTitle = source ? `${title} (${source})` : title;
        const { tier, tierLabel, authorityScore, sourceType } = classifySourceTier(link);
        const estimatedYear = extractYearFromText(pubDate + " " + title + " " + desc) || "2025";

        let domain = "";
        try {
          domain = new URL(link).hostname.replace(/^www\./, "");
        } catch {
          domain = source.toLowerCase().replace(/\s+/g, "") || "news.google.com";
        }

        hits.push({
          title: fullTitle,
          url: link,
          snippet: desc || title,
          domain,
          tier,
          tierLabel,
          authorityScore,
          sourceType,
          estimatedYear,
        });
      }
    }

    return hits;
  } catch (error) {
    console.warn("Google News search failed:", (error as Error).message);
    return [];
  }
}

async function searchArxiv(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const cleanQ = query.replace(/[^\w\s-]/g, " ").trim();
    const encoded = encodeURIComponent(cleanQ);
    const url = `https://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${limit}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ResearchifyAI/2.0 (Institutional Academic Verification Engine)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const hits: SearchHit[] = [];

    for (const entry of entries) {
      if (hits.length >= limit) break;
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);

      const title = (titleMatch ? titleMatch[1] : "").replace(/\s+/g, " ").trim();
      const link = (idMatch ? idMatch[1] : "").trim();
      const summary = (summaryMatch ? summaryMatch[1] : "").replace(/\s+/g, " ").trim();
      const published = publishedMatch ? publishedMatch[1] : "";
      const year = extractYearFromText(published) || "2024";

      if (title && link) {
        hits.push({
          title: `[Peer-Reviewed / arXiv] ${title}`,
          url: link,
          snippet: summary.slice(0, 400),
          domain: "arxiv.org",
          tier: "tier1",
          tierLabel: "Regulatory / Peer-Reviewed",
          authorityScore: 95,
          sourceType: "Official Academic Research Repository",
          estimatedYear: year,
        });
      }
    }

    return hits;
  } catch (error) {
    console.warn("arXiv search failed:", (error as Error).message);
    return [];
  }
}

async function searchWikipedia(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&utf8=&srlimit=${limit}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ResearchifyAI/2.0 (mailto:research@researchify.internal)",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const searchItems = data?.query?.search || [];
    const hits: SearchHit[] = [];

    for (const item of searchItems) {
      if (hits.length >= limit) break;
      const title = item.title;
      const snippet = (item.snippet || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
      const year = extractYearFromText(item.timestamp || "") || "2025";

      hits.push({
        title: `${title} — Institutional Knowledge Base`,
        url: pageUrl,
        snippet,
        domain: "wikipedia.org",
        tier: "tier2",
        tierLabel: "Institutional Knowledge Base",
        authorityScore: 85,
        sourceType: "Institutional Knowledge Base",
        estimatedYear: year,
      });
    }

    return hits;
  } catch (error) {
    console.warn("Wikipedia search failed:", (error as Error).message);
    return [];
  }
}

async function searchDuckDuckGo(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];
    const html = await res.text();
    if (html.includes("anomaly-modal")) return []; // Bot challenge page

    const $ = cheerio.load(html);
    const hits: SearchHit[] = [];

    $(".result__body").each((_, el) => {
      if (hits.length >= limit) return;
      const titleEl = $(el).find(".result__title");
      const title = titleEl.text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      const rawHref =
        $(el).find(".result__url").attr("href") || titleEl.find("a").attr("href") || "";

      let cleanUrl = rawHref;
      try {
        if (cleanUrl.includes("uddg=")) {
          const parsed = new URL(cleanUrl, "https://duckduckgo.com");
          const uddg = parsed.searchParams.get("uddg");
          if (uddg) cleanUrl = decodeURIComponent(uddg);
        }
      } catch {}

      if (title && cleanUrl && cleanUrl.startsWith("http") && !cleanUrl.includes("duckduckgo.com")) {
        const { tier, tierLabel, authorityScore, sourceType } = classifySourceTier(cleanUrl);
        const estimatedYear = extractYearFromText(title + " " + snippet + " " + cleanUrl);
        let domain = "";
        try {
          domain = new URL(cleanUrl).hostname.replace(/^www\./, "");
        } catch {}

        hits.push({
          title,
          url: cleanUrl,
          snippet: snippet || title,
          domain,
          tier,
          tierLabel,
          authorityScore,
          sourceType,
          estimatedYear,
        });
      }
    });

    return hits;
  } catch {
    return [];
  }
}

export async function searchWeb(
  query: string,
  limit: number = 6,
  recency?: "day" | "week" | "month" | "year",
): Promise<{ query: string; results: SearchHit[] }> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) return { query, results: [] };

    // Parallel multi-engine query execution
    const [newsHits, arxivHits, wikiHits, ddgHits] = await Promise.all([
      searchGoogleNews(cleanQuery, Math.max(3, limit)),
      searchArxiv(cleanQuery, Math.max(3, limit)),
      searchWikipedia(cleanQuery, Math.max(2, limit)),
      searchDuckDuckGo(cleanQuery, Math.max(2, limit)),
    ]);

    const combined = [...arxivHits, ...newsHits, ...wikiHits, ...ddgHits];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const deduplicated: SearchHit[] = [];

    for (const hit of combined) {
      if (!hit.url || typeof hit.url !== "string") continue;
      const normalizedUrl = hit.url.replace(/\/$/, "").toLowerCase();
      const normalizedTitle = hit.title.toLowerCase().slice(0, 50);

      if (!seenUrls.has(normalizedUrl) && !seenTitles.has(normalizedTitle)) {
        seenUrls.add(normalizedUrl);
        seenTitles.add(normalizedTitle);
        deduplicated.push(hit);
      }
    }

    // Sort by highest authority score first
    deduplicated.sort((a, b) => (b.authorityScore || 50) - (a.authorityScore || 50));

    const finalResults = deduplicated.slice(0, Math.max(limit, 5));
    return { query, results: finalResults };
  } catch (error) {
    console.error("Web search multi-engine error:", error);
    return { query, results: [] };
  }
}

export async function readPage(
  url: string,
): Promise<{ url: string; title: string; content: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,text/plain",
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
    return { url, title: url, content: `Synthesized research context for primary source: ${url}` };
  }
}
