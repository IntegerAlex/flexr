import pg from "pg";
export class db {
  constructor() {
    pg.client = new pg.Client({
      user: "",
      host: "localhost",
      database: "test",
    });
  }
}
