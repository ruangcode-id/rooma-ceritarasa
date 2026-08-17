import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("Connecting to PostgreSQL database...");
  const client = await pool.connect();
  try {
    console.log("Adding is_available and tags columns to menu_photos table...");
    await client.query(`
      ALTER TABLE "menu_photos" 
      ADD COLUMN IF NOT EXISTS "is_available" BOOLEAN NOT NULL DEFAULT true;
    `);

    await client.query(`
      ALTER TABLE "menu_photos" 
      ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    `);

    console.log("✅ Successfully updated menu_photos table schema!");

    const res = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'menu_photos';
    `);
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
