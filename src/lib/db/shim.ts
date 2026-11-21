import type { DbFilter, DbOperation, DbResult } from "./types";

/**
 * Query builder yang meniru API subset dari @supabase/supabase-js yang
 * dipakai proyek ini. Semua call site tetap sama (`supabase.from(...)`),
 * hanya implementasinya yang dialihkan ke executor database langsung.
 */

export type DbExecutor = (op: DbOperation) => Promise<DbResult<unknown>>;

type SelectOptions = { count?: "exact" | "estimated"; head?: boolean };
type UpsertOptions = { onConflict?: string; ignoreDuplicates?: boolean };

/* eslint-disable @typescript-eslint/no-explicit-any */
export class ShimQueryBuilder {
  private op: any;
  private done = false;

  constructor(
    private readonly exec: DbExecutor,
    private readonly table: string,
  ) {
    this.op = {
      kind: "select",
      table,
      columns: "*",
      filters: [],
      order: [],
    };
  }

  private write(): any {
    if (this.op.kind === "select" || this.op.kind === "rpc") {
      this.op = {
        kind: "insert",
        table: this.table,
        filters: [],
        returning: false,
      };
    }
    return this.op;
  }

  select(columns: string = "*", options?: SelectOptions) {
    if (this.op.kind === "select") {
      this.op.columns = columns;
      if (options?.count) this.op.count = true;
      if (options?.head) this.op.head = true;
    } else {
      this.op.returning = true;
      if (columns && columns !== "*") this.op.columns = columns;
    }
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = {
      kind: "insert",
      table: this.table,
      payload,
      filters: [],
      returning: false,
    };
    return this;
  }

  upsert(
    payload: Record<string, unknown> | Record<string, unknown>[],
    options?: UpsertOptions,
  ) {
    this.op = {
      kind: "upsert",
      table: this.table,
      payload,
      filters: [],
      returning: false,
      onConflict: options?.onConflict,
    };
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.op = {
      kind: "update",
      table: this.table,
      payload,
      filters: [],
      returning: false,
    };
    return this;
  }

  delete() {
    this.op = { kind: "delete", table: this.table, filters: [], returning: false };
    return this;
  }

  private filter(op: DbFilter["op"], col: string, value: unknown) {
    // Filter boleh dipakai pada select maupun write — jangan mengubah jenis
    // operasi di sini (write sudah menyiapkan op-nya sendiri).
    if (!this.op.filters) this.op.filters = [];
    this.op.filters.push({ op, col, value });
    return this;
  }

  eq(col: string, value: unknown) {
    return this.filter("eq", col, value);
  }
  neq(col: string, value: unknown) {
    return this.filter("neq", col, value);
  }
  in(col: string, value: unknown[]) {
    return this.filter("in", col, value);
  }
  gt(col: string, value: unknown) {
    return this.filter("gt", col, value);
  }
  gte(col: string, value: unknown) {
    return this.filter("gte", col, value);
  }
  lt(col: string, value: unknown) {
    return this.filter("lt", col, value);
  }
  lte(col: string, value: unknown) {
    return this.filter("lte", col, value);
  }
  like(col: string, value: unknown) {
    return this.filter("like", col, value);
  }
  ilike(col: string, value: unknown) {
    return this.filter("ilike", col, value);
  }
  is(col: string, value: unknown) {
    return this.filter("is", col, value);
  }

  order(col: string, options?: { ascending?: boolean }) {
    if (this.op.kind === "select") {
      this.op.order.push({ col, asc: options?.ascending !== false });
    }
    return this;
  }

  limit(count: number) {
    if (this.op.kind === "select") this.op.limit = count;
    return this;
  }

  range(from: number, to: number) {
    if (this.op.kind === "select") {
      this.op.offset = from;
      this.op.limit = to - from + 1;
    }
    return this;
  }

  single() {
    this.op.single = true;
    return this;
  }

  maybeSingle() {
    this.op.maybeSingle = true;
    return this;
  }

  private run() {
    if (this.done) return Promise.resolve({ data: null, error: null, count: null, status: 200, statusText: "OK" }) as Promise<DbResult<unknown>>;
    this.done = true;
    return this.exec(this.op);
  }

  then<TResult1 = DbResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.run().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ) {
    return this.run().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return this.run().finally(onfinally);
  }
}

/** Bungkus klien Supabase asli; auth & storage tetap memakai Supabase. */
export function wrapClient<T extends object>(real: T, exec: DbExecutor): T {
  return new Proxy(real, {
    get(target, prop) {
      if (prop === "from") {
        return (table: string) => new ShimQueryBuilder(exec, table);
      }
      if (prop === "rpc") {
        return (name: string, args: Record<string, unknown> = {}) =>
          exec({ kind: "rpc", name, args });
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;
}
