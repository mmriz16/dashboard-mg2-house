import { NextRequest, NextResponse } from "next/server";

const DEFAULT_TWEET_ID = "2027173869648216469";
const DEFAULT_USERNAME = "openclaw";
const X_API_BASE = "https://api.x.com/2";

type XMedia = {
  media_key?: string;
  type?: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
};

type XPostResponse = {
  data?: {
    id?: string;
    text?: string;
    created_at?: string;
    attachments?: {
      media_keys?: string[];
    };
  };
  includes?: {
    media?: XMedia[];
  };
};

type XUserLookupResponse = {
  data?: {
    id?: string;
    username?: string;
  };
};

type XTimelineTweet = {
  id?: string;
  text?: string;
  created_at?: string;
  attachments?: {
    media_keys?: string[];
  };
};

type XTimelineResponse = {
  data?: XTimelineTweet[];
  includes?: {
    media?: XMedia[];
  };
};

async function requestX<T>(token: string, url: URL): Promise<{ ok: true; data: T } | { ok: false; status: number; detail: string }> {
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, status: response.status, detail };
  }

  const data = (await response.json()) as T;
  return { ok: true, data };
}

function extractNotes(text: string): { icon: string; text: string }[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/https?:\/\/\S+/g, "").trim())
    .filter((line) => line.length > 0);

  return lines
    .slice(0, 8)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => !/^openclaw\s+v?\d{4}\.\d{1,2}\.\d{1,2}/i.test(line))
    .filter((line) => !/^more\b/i.test(line))
    .filter((line) => line.length > 0)
    .map((line) => ({ icon: "", text: line }));
}

function getPreviewImage(media: XMedia[] | undefined): string | undefined {
  if (!media || media.length === 0) return undefined;
  const photo = media.find((item) => item.type === "photo" && typeof item.url === "string");
  if (photo?.url) return photo.url;

  const preview = media.find((item) => typeof item.preview_image_url === "string");
  return preview?.preview_image_url;
}

function scoreTweetAsRelease(text: string): number {
  const normalized = text.toLowerCase();
  let score = 0;
  if (/(^|\s)(new release|release|update|changelog)(\s|:)/i.test(text)) score += 4;
  if (/v?\d{4}\.\d{1,2}\.\d{1,2}/.test(text)) score += 5;
  if (normalized.includes("openclaw")) score += 2;
  if (normalized.includes("fix") || normalized.includes("improvement")) score += 1;
  return score;
}

function isUpdateTweet(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasVersion = /v?\d{4}\.\d{1,2}\.\d{1,2}/.test(text);
  const hasReleaseKeyword = /(new release|release|update|changelog)/i.test(text);
  const hasChangeKeyword =
    /\b(fix|fixed|improvement|improved|security|breaking|hotfix|patch)\b/i.test(text);
  const hasBrand = normalized.includes("openclaw");
  return hasBrand && (hasVersion || hasReleaseKeyword || hasChangeKeyword);
}

function parseCreatedAt(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function pickBestTweet(tweets: XTimelineTweet[]): XTimelineTweet | null {
  if (tweets.length === 0) return null;

  const releaseCandidates = tweets.filter((tweet) => {
    const text = tweet.text || "";
    if (!isUpdateTweet(text)) return false;
    return scoreTweetAsRelease(text) >= 4;
  });

  if (releaseCandidates.length === 0) {
    return null;
  }

  releaseCandidates.sort((a, b) => parseCreatedAt(b.created_at) - parseCreatedAt(a.created_at));
  return releaseCandidates[0] || null;
}

async function fetchTweetById(token: string, tweetId: string): Promise<{ payload?: XPostResponse; error?: string }> {
  const apiUrl = new URL(`${X_API_BASE}/tweets/${encodeURIComponent(tweetId)}`);
  apiUrl.searchParams.set("tweet.fields", "created_at,text,attachments");
  apiUrl.searchParams.set("expansions", "attachments.media_keys");
  apiUrl.searchParams.set("media.fields", "type,url,preview_image_url,media_key");

  const result = await requestX<XPostResponse>(token, apiUrl);
  if (!result.ok) {
    return { error: `tweet-by-id:${result.status}:${result.detail}` };
  }
  return { payload: result.data };
}

async function fetchUserTimelineBasedRelease(token: string, username: string): Promise<{ payload?: XPostResponse; error?: string }> {
  const userUrl = new URL(`${X_API_BASE}/users/by/username/${encodeURIComponent(username)}`);
  const userLookup = await requestX<XUserLookupResponse>(token, userUrl);
  if (!userLookup.ok) {
    return { error: `user-lookup:${userLookup.status}:${userLookup.detail}` };
  }

  const userId = userLookup.data.data?.id;
  if (!userId) return { error: "user-lookup:missing-user-id" };

  const timelineUrl = new URL(`${X_API_BASE}/users/${encodeURIComponent(userId)}/tweets`);
  timelineUrl.searchParams.set("max_results", "12");
  timelineUrl.searchParams.set("exclude", "replies,retweets");
  timelineUrl.searchParams.set("tweet.fields", "created_at,text,attachments");
  timelineUrl.searchParams.set("expansions", "attachments.media_keys");
  timelineUrl.searchParams.set("media.fields", "type,url,preview_image_url,media_key");

  const timeline = await requestX<XTimelineResponse>(token, timelineUrl);
  if (!timeline.ok) {
    return { error: `user-timeline:${timeline.status}:${timeline.detail}` };
  }

  const selected = pickBestTweet(timeline.data.data || []);
  if (!selected?.id) return { error: "user-timeline:no-tweets" };

  const mediaByKey = new Map<string, XMedia>();
  for (const media of timeline.data.includes?.media || []) {
    if (media.media_key) mediaByKey.set(media.media_key, media);
  }

  const selectedMedia: XMedia[] = (selected.attachments?.media_keys || [])
    .map((key) => mediaByKey.get(key))
    .filter((m): m is XMedia => Boolean(m));

  return {
    payload: {
      data: {
        id: selected.id,
        text: selected.text,
        created_at: selected.created_at,
        attachments: selected.attachments,
      },
      includes: {
        media: selectedMedia,
      },
    },
  };
}

async function fetchSearchBasedRelease(token: string, username: string): Promise<{ payload?: XPostResponse; error?: string }> {
  const searchUrl = new URL(`${X_API_BASE}/tweets/search/recent`);
  searchUrl.searchParams.set("query", `from:${username} -is:retweet -is:reply`);
  searchUrl.searchParams.set("max_results", "12");
  searchUrl.searchParams.set("tweet.fields", "created_at,text,attachments");
  searchUrl.searchParams.set("expansions", "attachments.media_keys");
  searchUrl.searchParams.set("media.fields", "type,url,preview_image_url,media_key");

  const search = await requestX<XTimelineResponse>(token, searchUrl);
  if (!search.ok) {
    return { error: `recent-search:${search.status}:${search.detail}` };
  }

  const selected = pickBestTweet(search.data.data || []);
  if (!selected?.id) return { error: "recent-search:no-tweets" };

  const mediaByKey = new Map<string, XMedia>();
  for (const media of search.data.includes?.media || []) {
    if (media.media_key) mediaByKey.set(media.media_key, media);
  }

  const selectedMedia: XMedia[] = (selected.attachments?.media_keys || [])
    .map((key) => mediaByKey.get(key))
    .filter((m): m is XMedia => Boolean(m));

  return {
    payload: {
      data: {
        id: selected.id,
        text: selected.text,
        created_at: selected.created_at,
        attachments: selected.attachments,
      },
      includes: {
        media: selectedMedia,
      },
    },
  };
}

export async function GET(request: NextRequest) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing X_BEARER_TOKEN" }, { status: 500 });
  }

  const tweetId = request.nextUrl.searchParams.get("tweetId")?.trim() || "";
  const username = request.nextUrl.searchParams.get("username")?.trim() || DEFAULT_USERNAME;
  const errors: string[] = [];

  try {
    let payload: XPostResponse | undefined;

    if (tweetId) {
      const fromId = await fetchTweetById(token, tweetId);
      if (fromId.payload) payload = fromId.payload;
      if (fromId.error) errors.push(fromId.error);
    }

    if (!payload) {
      const fromTimeline = await fetchUserTimelineBasedRelease(token, username);
      if (fromTimeline.payload) payload = fromTimeline.payload;
      if (fromTimeline.error) errors.push(fromTimeline.error);
    }

    if (!payload) {
      const fromSearch = await fetchSearchBasedRelease(token, username);
      if (fromSearch.payload) payload = fromSearch.payload;
      if (fromSearch.error) errors.push(fromSearch.error);
    }

    if (!payload) {
      const fallback = await fetchTweetById(token, DEFAULT_TWEET_ID);
      if (fallback.payload) payload = fallback.payload;
      if (fallback.error) errors.push(`default-fallback:${fallback.error}`);
    }

    if (!payload) {
      return NextResponse.json(
        {
          error: "Unable to fetch X release data",
          attempts: errors,
        },
        { status: 502 }
      );
    }

    const postText = payload.data?.text || "";
    const createdAt = payload.data?.created_at;
    const notes = extractNotes(postText);
    const previewImageUrl = getPreviewImage(payload.includes?.media);

    return NextResponse.json({
      tweetId: payload.data?.id || tweetId || DEFAULT_TWEET_ID,
      username,
      createdAt,
      notes,
      previewImageUrl,
      rawText: postText,
      warnings: errors,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to fetch X post",
        detail: error instanceof Error ? error.message : "Unknown error",
        attempts: errors,
      },
      { status: 500 }
    );
  }
}
