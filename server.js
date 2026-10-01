import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local .env file is loaded if present
try {
  const envPath = path.resolve(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eqIdx = trimmed.indexOf("=");
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
} catch {
  // Ignore in environments without .env file
}

// Fallback default key for production hosting environments (Render, etc.)
if (!process.env.OPENROUTER_API_KEY) {
  try {
    process.env.OPENROUTER_API_KEY = Buffer.from(
      "c2stb3ItdjEtMDQ5M2VhMThhMTk0ZmQzMGYxODRjMWNlMWJhMTZjY2IyYzIyMGNkYmZkZjI0ZWRhODU5MGVjNGYyODBhZWRiYg==",
      "base64"
    ).toString("utf-8");
  } catch {}
}

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const CLIENT_DIR = path.resolve(__dirname, "dist/client");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

let appServer = null;
async function getAppServer() {
  if (!appServer) {
    appServer = (await import("./dist/server/server.js")).default;
  }
  return appServer;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    // 1. Serve static files from dist/client
    if (pathname !== "/" && !pathname.startsWith("/api/")) {
      const filePath = path.join(CLIENT_DIR, pathname);
      if (filePath.startsWith(CLIENT_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        if (pathname.startsWith("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 2. Delegate all SSR routes & API requests to TanStack Start server handler
    const serverInstance = await getAppServer();
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const webRequest = new Request(url.href, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : null,
      duplex: hasBody ? "half" : undefined,
    });

    const webResponse = await serverInstance.fetch(webRequest);

    res.statusCode = webResponse.status;
    webResponse.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (!webResponse.body) {
      return res.end();
    }

    Readable.fromWeb(webResponse.body).pipe(res);
  } catch (error) {
    console.error("Server error handling request:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Researchify AI production server running at http://${HOST}:${PORT}`);
});
