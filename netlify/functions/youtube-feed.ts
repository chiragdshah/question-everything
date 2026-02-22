import type { Handler, HandlerEvent } from "@netlify/functions";

const CHANNEL_ID = "UC2aiyplnabkJ7YzfWK1yISw";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const MAX_EPISODES = 6;

interface Episode {
    title: string;
    videoId: string;
    thumbnail: string;
    description: string;
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

        // Parse entries from XML using regex (no DOM parser needed in Node)
        const entries: Episode[] = [];
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;

        while ((match = entryRegex.exec(xml)) !== null && entries.length < MAX_EPISODES * 2) {
            const entry = match[1];

            // Extract video link to check if it's a short
            const linkMatch = entry.match(/<link rel="alternate" href="([^"]+)"\/>/);
            const url = linkMatch?.[1] || "";

            // Skip YouTube Shorts — only include full watch videos
            if (url.includes("/shorts/")) continue;

            const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = entry.match(/<media:title>([^<]+)<\/media:title>/);
            const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
            const pubMatch = entry.match(/<published>([^<]+)<\/published>/);

            if (videoIdMatch && titleMatch) {
                const videoId = videoIdMatch[1];
                const rawDesc = descMatch?.[1] || "";
                // Truncate description to first sentence or 200 chars
                const description = rawDesc.length > 200
                    ? rawDesc.substring(0, 200).replace(/\s+\S*$/, "") + "…"
                    : rawDesc;

                const decode = (s: string) =>
                    s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'");

                entries.push({
                    title: decode(titleMatch[1]),
                    videoId,
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    description: decode(description),
                    published: pubMatch?.[1] || "",
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                });
            }

            if (entries.length >= MAX_EPISODES) break;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ episodes: entries }),
        };
    } catch (err) {
        console.error("youtube-feed error:", err);
        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({ error: "Failed to fetch YouTube feed", episodes: [] }),
        };
    }
};

export { handler };
