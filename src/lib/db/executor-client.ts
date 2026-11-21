import type { DbOperation, DbResult } from "./types";

/** Eksekutor untuk klien browser: lewat API route Next.js. */
export async function executeViaApi(op: DbOperation): Promise<DbResult<unknown>> {
  try {
    const response = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(op),
    });
    const json = (await response.json().catch(() => ({}))) as DbResult<unknown>;
    if (!response.ok && !json.error) {
      json.error = { message: `Database API error ${response.status}` };
      json.status = response.status;
    }
    return json;
  } catch (e) {
    return {
      data: null,
      error: {
        message: e instanceof Error ? e.message : "Gagal menghubungi database API",
      },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    };
  }
}
