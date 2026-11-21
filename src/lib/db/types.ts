/**
 * Protokol internal untuk shim database.
 *
 * Supabase PostgREST project sedang gagal (PGRST002), jadi semua query
 * diterjemahkan menjadi operasi ini lalu dijalankan lewat koneksi Postgres
 * langsung (Supavisor pooler) oleh `src/app/api/db/route.ts`.
 *
 * Format ini sengaja bukan SQL bebas: hanya tabel + operasi yang dikenal
 * yang bisa dikirim, sehingga API tetap aman dipanggil dari browser.
 */

export type FilterOp =
  | "eq"
  | "neq"
  | "in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is";

export interface DbFilter {
  op: FilterOp;
  col: string;
  value: unknown;
}

export interface DbOrder {
  col: string;
  asc: boolean;
}

export type DbOperation =
  | {
      kind: "select";
      table: string;
      columns: string;
      filters: DbFilter[];
      order: DbOrder[];
      limit?: number;
      offset?: number;
      head?: boolean;
      count?: boolean;
      single?: boolean;
      maybeSingle?: boolean;
    }
  | {
      kind: "insert" | "update" | "upsert" | "delete";
      table: string;
      payload?: Record<string, unknown> | Record<string, unknown>[];
      filters: DbFilter[];
      onConflict?: string;
      returning?: boolean;
      single?: boolean;
      maybeSingle?: boolean;
    }
  | {
      kind: "rpc";
      name: string;
      args: Record<string, unknown>;
    };

export interface DbResult<T = unknown> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
  } | null;
  count: number | null;
  status: number;
  statusText: string;
}

export const okResult = <T>(data: T | null, count: number | null = null): DbResult<T> => ({
  data,
  error: null,
  count,
  status: 200,
  statusText: "OK",
});

export const errResult = (message: string, code?: string): DbResult<never> => ({
  data: null,
  error: { message, code },
  count: null,
  status: 400,
  statusText: "Bad Request",
});
