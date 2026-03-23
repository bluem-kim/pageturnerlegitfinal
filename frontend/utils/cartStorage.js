import * as SQLite from "expo-sqlite";

let dbPromise = null;
const GUEST_OWNER_KEY = "guest";

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("pageturnerr.db");
  }
  return dbPromise;
};

const initCartTable = async () => {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_key TEXT NOT NULL DEFAULT 'guest',
      item_json TEXT NOT NULL
    );
  `);

  const columns = await db.getAllAsync("PRAGMA table_info(cart_items);");
  const hasOwnerKey = (columns || []).some((column) => column?.name === "owner_key");
  if (!hasOwnerKey) {
    await db.execAsync("ALTER TABLE cart_items ADD COLUMN owner_key TEXT NOT NULL DEFAULT 'guest';");
  }
};

export const loadCartFromDb = async (ownerKey = GUEST_OWNER_KEY) => {
  await initCartTable();
  const db = await getDb();
  const rows = await db.getAllAsync(
    "SELECT item_json FROM cart_items WHERE owner_key = ? ORDER BY id ASC;",
    [ownerKey]
  );

  return (rows || [])
    .map((row) => {
      try {
        return JSON.parse(row.item_json);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
};

export const saveCartToDb = async (items = [], ownerKey = GUEST_OWNER_KEY) => {
  await initCartTable();
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM cart_items WHERE owner_key = ?;", [ownerKey]);
    for (const item of items) {
      await db.runAsync("INSERT INTO cart_items (owner_key, item_json) VALUES (?, ?);", [
        ownerKey,
        JSON.stringify(item),
      ]);
    }
  });
};

export const clearCartDb = async (ownerKey = GUEST_OWNER_KEY) => {
  await initCartTable();
  const db = await getDb();
  await db.runAsync("DELETE FROM cart_items WHERE owner_key = ?;", [ownerKey]);
};
