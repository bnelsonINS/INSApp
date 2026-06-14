import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BACKUP_ROOT =
  process.env.INS_STORAGE_BACKUP_DIR ||
  "/Users/macbook/Library/CloudStorage/OneDrive-Personal/Indiana Notary Solutions/INS Disaster Recovery/Storage";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const today = new Date().toISOString().slice(0, 10);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function listAllFiles(bucket, folder = "") {
  const allItems = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      console.error(`Failed listing ${bucket}/${folder}:`, error.message);
      return allItems;
    }

    if (!data || data.length === 0) break;

    allItems.push(...data);

    if (data.length < limit) break;

    offset += limit;
  }

  let files = [];

  for (const item of allItems) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;

    const isFolder =
      item.metadata === null ||
      item.id === null ||
      item.updated_at === null ||
      !item.name.includes(".");

    if (isFolder) {
      const nested = await listAllFiles(bucket, fullPath);
      files = files.concat(nested);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function downloadFile(bucket, filePath) {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);

  if (error) {
    console.error(`Failed downloading ${bucket}/${filePath}:`, error.message);
    return false;
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const localPath = path.join(BACKUP_ROOT, today, bucket, filePath);

  ensureDir(path.dirname(localPath));

  fs.writeFileSync(localPath, buffer);

  console.log(`Saved: ${bucket}/${filePath}`);

  return true;
}

async function main() {
  console.log("Starting INS Supabase Storage backup...");
  console.log(`Backup location: ${BACKUP_ROOT}`);
  console.log(`Backup date folder: ${today}`);

  ensureDir(BACKUP_ROOT);

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error("Failed listing buckets:", error.message);
    process.exit(1);
  }

  if (!buckets || buckets.length === 0) {
    console.log("No storage buckets found.");
    return;
  }

  let totalFiles = 0;
  let successfulDownloads = 0;
  let failedDownloads = 0;

  for (const bucket of buckets) {
    console.log("");
    console.log(`Backing up bucket: ${bucket.name}`);

    const files = await listAllFiles(bucket.name);

    if (files.length === 0) {
      console.log(`No files found in ${bucket.name}`);
      continue;
    }

    console.log(`Found ${files.length} file(s) in ${bucket.name}`);

    totalFiles += files.length;

    for (const file of files) {
      const success = await downloadFile(bucket.name, file);

      if (success) {
        successfulDownloads += 1;
      } else {
        failedDownloads += 1;
      }
    }
  }

  console.log("");
  console.log("Storage backup complete.");
  console.log(`Total files found: ${totalFiles}`);
  console.log(`Successful downloads: ${successfulDownloads}`);
  console.log(`Failed downloads: ${failedDownloads}`);

  if (failedDownloads > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected backup failure:", error);
  process.exit(1);
});