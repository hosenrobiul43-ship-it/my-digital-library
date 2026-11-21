// Cloudflare Worker: direct-download proxy for My Digital Library.
// Problem it solves: files live on archive.org, so a plain link makes the
// phone's browser OPEN the file (PDF viewer / text page) instead of
// downloading it. This worker fetches the file and returns it with
// Content-Disposition: attachment, so tapping Download starts a real
// download and no other site opens.
//
// Usage from the site: https://<worker-name>.<account>.workers.dev/?u=<url-encoded archive.org download URL>
// Security: only https://archive.org/download/* URLs are allowed —
// anything else is rejected, so the worker can never be used as an
// open proxy for other sites.

const ALLOWED_HOST = "archive.org";
const ALLOWED_PREFIX = "/download/";

function asciiName(name) {
  // Safe fallback filename: keep letters, digits, dot, dash, underscore.
  const clean = name.replace(/[^\w.\- ]+/g, "").replace(/ +/g, " ").trim();
  return clean || "book";
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }
    const target = url.searchParams.get("u");
    if (!target) {
      return new Response("Missing ?u= file URL", { status: 400 });
    }
    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Bad file URL", { status: 400 });
    }
    if (
      targetUrl.protocol !== "https:" ||
      targetUrl.hostname !== ALLOWED_HOST ||
      !targetUrl.pathname.startsWith(ALLOWED_PREFIX)
    ) {
      return new Response("Only archive.org download links are allowed", { status: 403 });
    }
    const rawName = decodeURIComponent(targetUrl.pathname.split("/").pop() || "book");
    // Forward the browser's Range header so big downloads can RESUME after
    // a dropped mobile connection instead of restarting from zero.
    const fetchHeaders = {
      "User-Agent":
        "MyDigitalLibrary-Download/1.0 (free public library; contact: hosenrobiul43@gmail.com)",
    };
    const range = request.headers.get("Range");
    if (range) fetchHeaders["Range"] = range;
    const res = await fetch(targetUrl.toString(), { headers: fetchHeaders });
    if (!res.ok) {
      return new Response("archive.org returned " + res.status, { status: 502 });
    }
    const headers = new Headers(res.headers);
    // Force download (this header is what makes the phone save the file
    // instead of opening it). filename* keeps non-ASCII names working.
    const encoded = encodeURIComponent(rawName).replace(/'/g, "%27");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${asciiName(rawName)}"; filename*=UTF-8''${encoded}`
    );
    headers.set("Cache-Control", "public, max-age=86400");
    return new Response(res.body, { status: res.status, headers });
  },
};
