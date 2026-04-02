require("dotenv").config({ path: "./backend/.env" });
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const statements = [
    "create policy \"authenticated can view files\" on storage.objects for select to authenticated using (bucket_id = 'eltreko-files')",
    "create policy \"authenticated can upload files\" on storage.objects for insert to authenticated with check (bucket_id = 'eltreko-files')",
    "create policy \"authenticated can update files\" on storage.objects for update to authenticated using (bucket_id = 'eltreko-files') with check (bucket_id = 'eltreko-files')"
  ];

  for (const sql of statements) {
    try {
      await client.query(sql);
    } catch (error) {
      if (!String(error.message || "").toLowerCase().includes("already exists")) {
        throw error;
      }
    }
  }

  await client.end();
  console.log("storage-policies-ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
