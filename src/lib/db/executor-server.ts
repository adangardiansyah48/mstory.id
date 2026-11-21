import { executeOperation } from "./engine";
import type { DbExecutor } from "./shim";

/** Eksekutor untuk Server Component / Route Handler: langsung ke Postgres. */
export const executeLocally: DbExecutor = executeOperation;
