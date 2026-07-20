import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getSafeApiErrorText,
  getStatusErrorMessage,
} from "../src/lib/api-error-messages.mjs";

const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const srcRoot = join(projectRoot, "src");

function findSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return findSourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

test("401, 403, 413, and 429 have distinct safe UI messages", () => {
  const messages = [401, 403, 413, 429].map(getStatusErrorMessage);

  for (const message of messages) {
    assert.equal(typeof message, "string");
    assert.ok(message.length > 0);
  }
  assert.equal(new Set(messages).size, messages.length);
});

test("API error text sanitizer rejects stack traces and internal paths", () => {
  assert.equal(
    getSafeApiErrorText({ error: "Tanggal reservasi tidak tersedia." }),
    "Tanggal reservasi tidak tersedia.",
  );
  assert.equal(
    getSafeApiErrorText({ error: "Error: database failed\n at save (/src/db.ts:2:1)" }),
    null,
  );
  assert.equal(
    getSafeApiErrorText({ message: "C:\\app\\node_modules\\driver.js" }),
    null,
  );
});

test("every protected client fetch uses the shared API error handler", () => {
  const unprotectedFiles = [];
  let checkedFileCount = 0;

  for (const file of findSourceFiles(srcRoot)) {
    const source = readFileSync(file, "utf8");
    const hasProtectedFetch =
      source.includes("fetch(") && /\/api\/(?:admin|owner)/.test(source);

    if (!hasProtectedFetch) continue;
    checkedFileCount += 1;

    if (!source.includes("handleApiError")) {
      unprotectedFiles.push(relative(projectRoot, file));
    }
  }

  assert.ok(checkedFileCount > 0, "no protected client fetches were checked");
  assert.deepEqual(unprotectedFiles, []);
});
