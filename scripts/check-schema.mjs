#!/usr/bin/env node
/**
 * Schema audit: does the code write columns the database actually has?
 *
 * Three production bugs came from this exact mismatch. In each case an insert
 * referenced a column that did not exist, Supabase rejected the row, the error
 * was swallowed, and the feature failed in a way that pointed somewhere else
 * entirely. The scanner "returning no results" was really every result insert
 * being rejected over a stray user_id.
 *
 * Usage:
 *   node scripts/check-schema.mjs           # parse supabase/full-migration.sql
 *   node scripts/check-schema.mjs --live    # query the database instead
 *
 * --live needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF. The default
 * needs nothing, so it runs in CI without secrets.
 *
 * Exit 0 clean, exit 1 on any mismatch.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SRC = "src";
const SCHEMA_FILE = "supabase/full-migration.sql";
const LIVE = process.argv.includes("--live");

// ---------------------------------------------------------------- schema side

/** Columns per table, parsed from the consolidated migration file. */
function schemaFromFile() {
  const sql = readFileSync(SCHEMA_FILE, "utf8");
  const tables = {};

  const createRe = /create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/gi;
  for (const m of sql.matchAll(createRe)) {
    const cols = new Set();
    for (const raw of m[2].split("\n")) {
      const line = raw.trim().replace(/,$/, "");
      if (!line || line.startsWith("--")) continue;
      if (/^(primary key|unique|constraint|check|foreign key)\b/i.test(line)) continue;
      const col = line.split(/\s+/)[0];
      if (/^[a-z_][a-z0-9_]*$/i.test(col)) cols.add(col);
    }
    tables[m[1]] = cols;
  }

  const alterRe = /alter table (?:only )?public\.(\w+)([\s\S]*?);/gi;
  for (const m of sql.matchAll(alterRe)) {
    const t = (tables[m[1]] ??= new Set());
    for (const c of m[2].matchAll(/add column (?:if not exists )?(\w+)/gi)) t.add(c[1]);
  }

  return tables;
}

/** Columns per table, straight from information_schema. */
async function schemaFromLive() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    console.error("--live needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
    process.exit(2);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Without a conventional UA, Cloudflare answers 403 error 1010.
        "User-Agent": "curl/8.4.0",
      },
      body: JSON.stringify({
        query:
          "select table_name, column_name from information_schema.columns " +
          "where table_schema = 'public';",
      }),
    }
  );

  if (!res.ok) {
    console.error(`Live schema query failed: HTTP ${res.status}`);
    process.exit(2);
  }

  const tables = {};
  for (const row of await res.json()) {
    (tables[row.table_name] ??= new Set()).add(row.column_name);
  }
  return tables;
}

// ------------------------------------------------------------------ code side

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if ([".ts", ".tsx"].includes(extname(p))) out.push(p);
  }
  return out;
}

/** Strip nested object literals so only top-level keys remain. */
function topLevelOnly(body) {
  let prev;
  do {
    prev = body;
    body = body.replace(/\{[^{}]*\}/g, "");
  } while (body !== prev);
  return body;
}

/** Every column each table is written with, and where from. */
function writesFromCode() {
  const writes = {};
  const writeRe = /\.from\(\s*["'`](\w+)["'`]\s*\)\s*\.\s*(insert|update|upsert)\s*\(\s*\{/g;

  for (const file of sourceFiles(SRC)) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(writeRe)) {
      const table = m[1];
      let depth = 0;
      let i = m.index + m[0].length - 1;
      const start = i;
      for (; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}" && --depth === 0) break;
      }

      const body = topLevelOnly(src.slice(start, i));
      for (const k of body.matchAll(/(?:^|[,{])\s*([a-z_][a-z0-9_]*)\s*:/gi)) {
        ((writes[table] ??= {})[k[1]] ??= new Set()).add(
          `${file}:${src.slice(0, m.index).split("\n").length}`
        );
      }
    }
  }
  return writes;
}

// ---------------------------------------------------------------------- main

const schema = LIVE ? await schemaFromLive() : schemaFromFile();
const writes = writesFromCode();

const source = LIVE ? "the live database" : SCHEMA_FILE;
const tableCount = Object.keys(schema).length;
console.log(`Schema audit: ${Object.keys(writes).length} written table(s) against ${tableCount} in ${source}\n`);

const problems = [];
for (const [table, cols] of Object.entries(writes).sort()) {
  if (!schema[table]) {
    problems.push({ table, missing: ["<table does not exist>"], where: new Set() });
    continue;
  }
  const missing = Object.keys(cols).filter((c) => !schema[table].has(c)).sort();
  if (missing.length) {
    const where = new Set(missing.flatMap((c) => [...cols[c]]));
    problems.push({ table, missing, where });
  }
}

if (!problems.length) {
  console.log("PASS. Every insert, update, and upsert targets a column that exists.");
  process.exit(0);
}

console.error("FAIL. The code writes columns the schema does not have:\n");
for (const p of problems) {
  console.error(`  ${p.table}`);
  console.error(`    missing: ${p.missing.join(", ")}`);
  for (const w of p.where) console.error(`    at:      ${w}`);
  console.error("");
}
console.error(
  "These fail silently at runtime. Supabase rejects the row and the error is\n" +
  "usually swallowed, so the feature breaks somewhere unrelated.\n\n" +
  "Fix by correcting the column name in the code, or by adding the column to\n" +
  `${SCHEMA_FILE} and running it against the database.`
);
process.exit(1);
