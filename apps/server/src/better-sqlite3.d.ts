declare module "better-sqlite3" {
  class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...args: unknown[]): unknown;
      get(...args: unknown[]): unknown;
      all(...args: unknown[]): unknown[];
    };
    pragma(sql: string): unknown;
  }

  export default Database;
}
