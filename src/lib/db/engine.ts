import pg from "pg";
import type { DbFilter, DbResult, DbOrder } from "./types";

// Supabase/PostgREST mengembalikan BIGINT & NUMERIC sebagai number.
// pg secara default mengembalikannya sebagai string — samakan di sini agar
// perhitungan di komponen (subtotal + transport, dll.) tidak konkatenasi string.
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value: string) => Number(value));

/* ------------------------------------------------------------------ */
/* Koneksi Postgres langsung (Supavisor transaction pooler)             */
/* ------------------------------------------------------------------ */

let pool: pg.Pool | null = null;

function getPool() {
  if (pool) return pool;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!url || !password) {
    throw new Error(
      "Database langsung belum dikonfigurasi. Set SUPABASE_DB_PASSWORD di environment (Vercel: Project Settings → Environment Variables).",
    );
  }

  const ref = new URL(url).hostname.split(".")[0];
  const host = process.env.SUPABASE_DB_HOST || "aws-0-ap-southeast-1.pooler.supabase.com";
  const port = Number(process.env.SUPABASE_DB_PORT || 6543);

  pool = new pg.Pool({
    host,
    port,
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
  });
  return pool;
}

/* ------------------------------------------------------------------ */
/* SQL helper                                                          */
/* ------------------------------------------------------------------ */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function qi(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Nama kolom/tabel tidak valid: ${name}`);
  return `"${name}"`;
}

function qid(name: string): string {
  return qi(name);
}

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Relasi FK yang dipakai peng-gabungan (embed) select ala PostgREST. */
const EDGES: { from: string; col: string; to: string }[] = [
  { from: "bookings", col: "client_id", to: "clients" },
  { from: "bookings", col: "vendor_id", to: "vendors" },
  { from: "booking_details", col: "booking_id", to: "bookings" },
  { from: "booking_details", col: "package_id", to: "packages" },
  { from: "booking_addons", col: "booking_id", to: "bookings" },
  { from: "booking_addons", col: "addon_id", to: "addons" },
  { from: "project_progress", col: "booking_id", to: "bookings" },
  { from: "packages", col: "sub_category_id", to: "sub_categories" },
  { from: "sub_categories", col: "category_id", to: "categories" },
  { from: "testimonials", col: "booking_id", to: "bookings" },
  { from: "website_albums", col: "category_id", to: "categories" },
  { from: "website_gallery_items", col: "category_id", to: "categories" },
  { from: "website_album_photos", col: "album_id", to: "website_albums" },
];

type SelectNode =
  | { kind: "star" }
  | { kind: "col"; name: string }
  | { kind: "embed"; alias: string; table: string; inner: SelectNode[] };

function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current);
  return out;
}

function parseSelect(select: string | undefined): SelectNode[] {
  if (!select || !select.trim() || select.trim() === "*") return [{ kind: "star" }];
  return splitTopLevel(select).map((raw) => {
    const part = raw.trim();
    if (part === "*") return { kind: "star" };
    let m = part.match(
      /^([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)!?inner\s*\(([\s\S]*)\)$/,
    );
    if (!m) m = part.match(/^([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/);
    if (m) {
      return {
        kind: "embed",
        alias: m[1],
        table: m[2],
        inner: parseSelect(m[3]),
      };
    }
    m = part.match(/^([A-Za-z_]\w*)!?inner\s*\(([\s\S]*)\)$/);
    if (!m) m = part.match(/^([A-Za-z_]\w*)\s*\(([\s\S]*)\)$/);
    if (m) {
      return {
        kind: "embed",
        alias: m[1],
        table: m[1],
        inner: parseSelect(m[2]),
      };
    }
    return { kind: "col", name: part };
  });
}

function jsonExpr(nodes: SelectNode[], table: string, alias: string, depth: number): string {
  const parts: string[] = [];
  if (nodes.some((n) => n.kind === "star")) parts.push(`to_jsonb(${alias})`);

  for (const node of nodes) {
    if (node.kind === "star") continue;
    if (node.kind === "col") {
      parts.push(`jsonb_build_object(${lit(node.name)}, ${alias}.${qi(node.name)})`);
      continue;
    }

    const child = `r${depth + 1}`;
    const childJson = jsonExpr(node.inner, node.table, child, depth + 1);
    const direct = EDGES.find((e) => e.from === table && e.to === node.table);
    const reverse = EDGES.find((e) => e.from === node.table && e.to === table);

    if (direct) {
      // Parent menyimpan FK (mis. bookings.client_id → clients.id).
      parts.push(
        `jsonb_build_object(${lit(node.alias)}, ` +
          `(select ${childJson} from ${qid(node.table)} ${child} ` +
          `where ${child}."id" = ${alias}.${qi(direct.col)} limit 1))`,
      );
    } else if (reverse) {
      parts.push(
        `jsonb_build_object(${lit(node.alias)}, ` +
          `coalesce((select jsonb_agg(${childJson}) from ${qid(node.table)} ${child} ` +
          `where ${child}.${qi(reverse.col)} = ${alias}."id"), '[]'::jsonb))`,
      );
    } else {
      parts.push(`jsonb_build_object(${lit(node.alias)}, null::jsonb)`);
    }
  }

  if (parts.length === 0) return "'{}'::jsonb";
  return `(${parts.join(" || ")})`;
}

function buildWhere(filters: DbFilter[], alias: string, params: unknown[]): string {
  if (!filters.length) return "";
  const clauses = filters.map((f) => {
    const col = `${alias}.${qi(f.col)}`;
    switch (f.op) {
      case "eq": {
        if (f.value === null) return `${col} is null`;
        params.push(f.value);
        return `${col} = $${params.length}`;
      }
      case "neq": {
        if (f.value === null) return `${col} is not null`;
        params.push(f.value);
        return `${col} <> $${params.length}`;
      }
      case "in": {
        const values = Array.isArray(f.value) ? f.value : [];
        if (!values.length) return "false";
        const holes = values.map((v) => {
          params.push(v);
          return `$${params.length}`;
        });
        return `${col} in (${holes.join(", ")})`;
      }
      case "gt":
      case "gte":
      case "lt":
      case "lte": {
        params.push(f.value);
        const op = { gt: ">", gte: ">=", lt: "<", lte: "<=" }[f.op];
        return `${col} ${op} $${params.length}`;
      }
      case "like":
      case "ilike": {
        params.push(f.value);
        return `${col} ${f.op === "like" ? "like" : "ilike"} $${params.length}`;
      }
      case "is":
        return f.value === null ? `${col} is null` : `${col} is not null`;
      default:
        throw new Error(`Filter tidak dikenal: ${f.op}`);
    }
  });
  return ` where ${clauses.join(" and ")}`;
}

function buildOrder(order: DbOrder[], alias: string): string {
  if (!order.length) return "";
  return ` order by ${order
    .map((o) => `${alias}.${qi(o.col)} ${o.asc ? "asc" : "desc"}`)
    .join(", ")}`;
}

function sqlValue(value: unknown, params: unknown[]): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    value = JSON.stringify(value);
  }
  params.push(value ?? null);
  return `$${params.length}`;
}

function buildWriteColumns(
  payload: Record<string, unknown> | Record<string, unknown>[] | undefined,
): { cols: string[]; rows: Record<string, unknown>[] } {
  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const cols: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!cols.includes(key)) cols.push(key);
    }
  }
  if (!cols.length) throw new Error("Payload kosong");
  return { cols, rows };
}

/* ------------------------------------------------------------------ */
/* Eksekutor operasi                                                    */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function executeOperation<T = unknown>(
  op: any,
): Promise<DbResult<T>> {
  const client = await getPool().connect();
  const params: unknown[] = [];

  try {
    let sql = "";
    let shape: "rows" | "scalar" | "none" = "rows";

    if (op.kind === "select") {
      const alias = "t0";
      const nodes = parseSelect(op.columns);
      if (op.head || op.count) {
        sql = `select count(*)::int as n from ${qid(op.table)} ${alias}${buildWhere(op.filters, alias, params)}`;
        shape = "scalar";
      } else {
        const expr = jsonExpr(nodes, op.table, alias, 0);
        sql = `select ${expr} as __data from ${qid(op.table)} ${alias}`;
        sql += buildWhere(op.filters, alias, params);
        sql += buildOrder(op.order, alias);
        if (typeof op.limit === "number") {
          params.push(op.limit);
          sql += ` limit $${params.length}`;
        }
        if (typeof op.offset === "number") {
          params.push(op.offset);
          sql += ` offset $${params.length}`;
        }
      }
    } else if (op.kind === "insert") {
      const { cols, rows } = buildWriteColumns(op.payload);
      const values = rows
        .map(
          (row) =>
            `(${cols.map((c) => sqlValue(row[c] ?? null, params)).join(", ")})`,
        )
        .join(", ");
      sql = `insert into ${qid(op.table)} (${cols.map(qi).join(", ")}) values ${values}`;
      sql += op.returning ? ` returning to_jsonb("${op.table}") as __data` : "";
    } else if (op.kind === "update") {
      const { cols, rows } = buildWriteColumns(op.payload);
      const row = rows[0] ?? {};
      const alias = "t0";
      const sets = cols.map((c) => `${qi(c)} = ${sqlValue(row[c] ?? null, params)}`);
      sql = `update ${qid(op.table)} set ${sets.join(", ")}`;
      sql += buildWhere(op.filters, alias, params).replace(`${alias}.`, `${qid(op.table)}.`);
      sql += op.returning ? ` returning to_jsonb("${op.table}") as __data` : "";
    } else if (op.kind === "upsert") {
      const { cols, rows } = buildWriteColumns(op.payload);
      const values = rows
        .map(
          (row) =>
            `(${cols.map((c) => sqlValue(row[c] ?? null, params)).join(", ")})`,
        )
        .join(", ");
      const conflict = String(op.onConflict || "id")
        .split(",")
        .map((c: string) => qi(c.trim()))
        .join(", ");
      const updates = cols.filter((c) => !conflict.includes(qi(c))).map((c) => `${qi(c)} = excluded.${qi(c)}`);
      sql = `insert into ${qid(op.table)} (${cols.map(qi).join(", ")}) values ${values}`;
      sql += ` on conflict (${conflict}) do ${updates.length ? `update set ${updates.join(", ")}` : "nothing"}`;
      sql += op.returning ? ` returning to_jsonb("${op.table}") as __data` : "";
    } else if (op.kind === "delete") {
      const alias = "t0";
      sql = `delete from ${qid(op.table)}`;
      sql += buildWhere(op.filters, alias, params).replace(`${alias}.`, `${qid(op.table)}.`);
      sql += op.returning ? ` returning to_jsonb("${op.table}") as __data` : "";
    } else if (op.kind === "rpc") {
      if (op.name === "generate_invoice_number") {
        sql =
          "with last_inv as (select invoice_number from public.bookings " +
          "where invoice_number like 'INV-%' || to_char(now(), 'MMYYYY') || '-%' " +
          "order by invoice_number desc limit 1) " +
          "select 'INV-' || to_char(now(), 'DDMMYYYY') || '-' || " +
          "lpad((coalesce(substring(invoice_number from '(\\d{4})$')::int, 0) + 1)::text, 4, '0') as invoice_number " +
          "from last_inv";
        shape = "scalar";
      } else if (op.name === "lookup_bookings") {
        const q = String(op.args?.p_query ?? "").trim();
        if (!q) {
          sql = "select null::bigint as id where false";
        } else {
          params.push(`%${q}%`);
          params.push(`%${q.replace(/\D/g, "")}%`);
          sql =
            "select b.* from public.bookings b left join public.clients c on c.id = b.client_id " +
            `where b.invoice_number ilike $${params.length - 1} ` +
            `or c.whatsapp_number like $${params.length} ` +
            "order by b.created_at desc limit 5";
        }
      } else {
        const args = Object.values(op.args || {});
        const holes = args.map((v) => sqlValue(v, params));
        sql = `select * from public.${qi(op.name)}(${holes.join(", ")})`;
      }
    } else {
      throw new Error("Operasi tidak dikenal");
    }

    const result = await client.query(sql, params);

    if (shape === "scalar") {
      const value = result.rows[0];
      const data = value ? (value.n ?? value.invoice_number ?? null) : null;
      return {
        data: (op.head ? null : op.count ? Number(value?.n ?? 0) : data) as T,
        error: null,
        count: op.count || op.head ? Number(value?.n ?? 0) : null,
        status: 200,
        statusText: "OK",
      };
    }

    const rows = result.rows.map((r) => r.__data ?? r).filter((r) => r != null);

    if (op.kind === "rpc") {
      return {
        data: rows as T,
        error: null,
        count: result.rows.length,
        status: 200,
        statusText: "OK",
      };
    }

    let data: T | null;
    if (op.kind === "select" && (op.single || op.maybeSingle)) {
      data = (rows[0] ?? null) as T | null;
    } else if (op.kind === "select") {
      data = rows as T;
    } else if (op.returning) {
      data = (op.single || op.maybeSingle ? rows[0] ?? null : rows) as T | null;
    } else {
      data = null;
    }

    return {
      data,
      error: null,
      count: op.kind === "select" ? rows.length : null,
      status: 200,
      statusText: "OK",
    };
  } catch (e) {
    const err = e as { message?: string; code?: string; detail?: string; hint?: string };
    return {
      data: null,
      error: {
        message: err.message || "Gagal menjalankan query database",
        code: err.code,
        details: err.detail ?? null,
        hint: err.hint ?? null,
      },
      count: null,
      status: 400,
      statusText: "Bad Request",
    };
  } finally {
    client.release();
  }
}
