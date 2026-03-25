import type { Handler, HandlerEvent } from "@netlify/functions";

const CHANNEL_ID = "UC2aiyplnabkJ7YzfWK1yISw";
// UUSH playlist = YouTube's auto-generated Shorts-only feed
const UUSH_PLAYLIST_ID = "UUSH" + CHANNEL_ID.slice(2);
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${UUSH_PLAYLIST_ID}`;
const MAX_SHORTS = 8;

interface Short {
    title: string;
    videoId: string;
    thumbnail: string;
    published: string;
    url: string;
}

const handler: Handler = async (event: HandlerEvent) => {
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
    };

    try {
        const res = await fetch(FEED_URL);
        if (!res.ok) {
            throw new Error(`YouTube feed returned ${res.status}`);
        }
        const xml = await res.text();

        const entries: Short[] = [];
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;

        while ((match = entryRegex.exec(xml)) !== null && entries.length < MAX_SHORTS * 2) {
            const entry = match[1];

            const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = entry.match(/<media:title>([^<]+)<\/media:title>/);
            const pubMatch = entry.match(/<published>([^<]+)<\/published>/);

            if (videoIdMatch && titleMatch) {
                const videoId = videoIdMatch[1];

                const decode = (s: string) =>
                    s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'");

                entries.push({
                    title: decode(titleMatch[1]),
                    videoId,
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    published: pubMatch?.[1] || "",
                    url: `https://www.youtube.com/shorts/${videoId}`,
                });
            }

            if (entries.length >= MAX_SHORTS) break;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ shorts: entries }),
        };
    } catch (err) {
        console.error("youtube-shorts error:", err);
        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: "Failed to fetch YouTube Shorts feed", shorts: [] }),
        };
    }
};

export { handler };
