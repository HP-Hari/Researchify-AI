import * as cheerio from "cheerio";

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

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
        results.push({
          title,
          url: cleanUrl,
          snippet: snippet || title,
        });
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
