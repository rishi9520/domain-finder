import { logger } from "../logger";

export interface RawNewsItem {
  source: string;
  sourceId: string;
  title: string;
  summary: string | null;
  url: string | null;
  publishedAt: Date;
  // Engagement signals from upstream platform (points, comments, score, etc.).
  metadata: Record<string, unknown>;
}

const HN_TOP = "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=50";
const REDDIT_FEEDS = [
  "https://www.reddit.com/r/technology/top.json?t=day&limit=40",
  "https://www.reddit.com/r/artificial/top.json?t=day&limit=40",
  "https://www.reddit.com/r/MachineLearning/top.json?t=day&limit=30",
  "https://www.reddit.com/r/startups/top.json?t=day&limit=30",
  "https://www.reddit.com/r/biotech/top.json?t=day&limit=20",
  "https://www.reddit.com/r/space/top.json?t=day&limit=20",
];

interface HnHit {
  objectID: string;
  title?: string | null;
  story_text?: string | null;
  url?: string | null;
  created_at: string;
  points?: number | null;
  num_comments?: number | null;
  author?: string | null;
}

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext?: string;
    url?: string;
    permalink: string;
    created_utc: number;
    score: number;
    num_comments: number;
    subreddit: string;
    author: string;
  };
}

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "domain-finder-news-ingest/1.0 (+https://github.com/rishi9520/domain-finder)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      logger.debug({ url, status: res.status }, "news source non-OK");
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logger.debug({ url, err }, "news source fetch failed");
    return null;
  }
}

export async function fetchHackerNews(): Promise<RawNewsItem[]> {
  const json = await fetchJson<{ hits: HnHit[] }>(HN_TOP);
  if (!json?.hits) return [];
  return json.hits
    .filter((h) => h.title && h.title.trim().length > 0)
    .map((h) => ({
      source: "hackernews",
      sourceId: h.objectID,
      title: h.title!,
      summary: h.story_text ?? null,
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      publishedAt: new Date(h.created_at),
      metadata: {
        points: h.points ?? 0,
        comments: h.num_comments ?? 0,
        author: h.author ?? null,
      },
    }));
}

export async function fetchReddit(): Promise<RawNewsItem[]> {
  const out: RawNewsItem[] = [];
  for (const feed of REDDIT_FEEDS) {
    const json = await fetchJson<{ data?: { children?: RedditPost[] } }>(feed);
    const posts = json?.data?.children ?? [];
    for (const p of posts) {
      const d = p.data;
      if (!d.title) continue;
      out.push({
        source: `reddit:${d.subreddit}`,
        sourceId: d.id,
        title: d.title,
        summary: d.selftext && d.selftext.length < 1500 ? d.selftext : null,
        url: d.url ?? `https://www.reddit.com${d.permalink}`,
        publishedAt: new Date(d.created_utc * 1000),
        metadata: {
          score: d.score,
          comments: d.num_comments,
          author: d.author,
          subreddit: d.subreddit,
        },
      });
    }
  }
  return out;
}

export async function fetchAllSources(): Promise<RawNewsItem[]> {
  const [hn, reddit] = await Promise.all([
    fetchHackerNews().catch(() => []),
    fetchReddit().catch(() => []),
  ]);
  return [...hn, ...reddit];
}
