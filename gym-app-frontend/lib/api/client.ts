import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/schema";
import { getAuthHeaders } from "@/lib/auth/session";

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});

api.use({
  async onRequest({ request }) {
    const headers = await getAuthHeaders();
    for (const [key, value] of Object.entries(headers)) {
      request.headers.set(key, value);
    }
    return request;
  },
});
