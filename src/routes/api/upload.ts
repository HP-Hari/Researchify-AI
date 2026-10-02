import { createFileRoute } from "@tanstack/react-router";

import { handleGetUploads, handleUpload } from "@/lib/upload.server";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      GET: () => handleGetUploads(),
      POST: ({ request }) => handleUpload(request),
    },
  },
});
