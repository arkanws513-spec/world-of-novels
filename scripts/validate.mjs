import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const errors = [];
const fail = message => errors.push(message);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true })
  .filter(entry => entry.name !== ".git")
  .flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
const files = walk(ROOT);
const relative = file => path.relative(ROOT, file).split(path.sep).join("/");
const existsLocal = file => fs.existsSync(file) && fs.statSync(file).isFile();

for (const file of files.filter(file => /\.(?:json)$/i.test(file))) {
  try { JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail("Invalid JSON " + relative(file) + ": " + error.message); }
}

for (const file of files.filter(file => /\.(?:js|mjs)$/i.test(file))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) fail("JavaScript syntax error in " + relative(file) + ": " + (result.stderr || result.stdout).trim());
}

function checkBalancedCss(source, file) {
  let depth = 0, quote = "", comment = false, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i], next = source[i + 1];
    if (comment) { if (char === "*" && next === "/") { comment = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "*") { comment = true; i++; continue; }
    if (char === "\"" || char === "'") { quote = char; continue; }
    if (char === "{") depth++;
    if (char === "}" && --depth < 0) { fail("Unexpected closing CSS brace in " + relative(file)); return; }
  }
  if (comment || quote || depth !== 0) fail("Unclosed CSS comment, string, or block in " + relative(file));
}
for (const file of files.filter(file => file.endsWith(".css"))) {
  checkBalancedCss(fs.readFileSync(file, "utf8"), file);
}

function checkReference(raw, sourceFile, kind) {
  const ref = raw.trim();
  if (!ref || ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("//") || ["mailto:", "tel:", "data:", "blob:", "#"].some(prefix => ref.toLowerCase().startsWith(prefix))) return;
  if (/^javascript:/i.test(ref)) { fail("Unsafe javascript: " + kind + " in " + relative(sourceFile)); return; }
  let decoded;
  try { decoded = decodeURIComponent(ref); }
  catch { fail("Malformed URL encoding in " + relative(sourceFile) + ": " + ref); return; }
  const basePath = "/" + relative(sourceFile);
  let pathname;
  try { pathname = new URL(decoded, "https://local.invalid" + basePath).pathname; }
  catch { fail("Invalid " + kind + " in " + relative(sourceFile) + ": " + ref); return; }
  pathname = pathname.replace(/^\/world-of-novels\//, "/").replace(/^\/+/, "");
  if (!pathname) pathname = "index.html";
  if (pathname.endsWith("/")) pathname += "index.html";
  const target = path.resolve(ROOT, ...pathname.split("/"));
  if (!target.startsWith(ROOT + path.sep) && target !== path.join(ROOT, "index.html")) {
    fail("Reference escapes repository in " + relative(sourceFile) + ": " + ref); return;
  }
  if (!existsLocal(target)) fail("Broken " + kind + " in " + relative(sourceFile) + ": " + ref + " -> " + pathname);
}

for (const file of files.filter(file => file.endsWith(".html"))) {
  const html = fs.readFileSync(file, "utf8");
  if (!/^\s*<!doctype html>/i.test(html)) fail("Missing HTML doctype: " + relative(file));
  for (const tag of ["html", "head", "title", "body"]) {
    const opens = (html.match(new RegExp("<" + tag + "\\b", "gi")) || []).length;
    const closes = (html.match(new RegExp("</" + tag + "\\s*>", "gi")) || []).length;
    if (opens !== 1 || closes !== 1) fail("Unbalanced " + tag + " element in " + relative(file));
  }
  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) fail("Duplicate HTML id(s) in " + relative(file) + ": " + [...new Set(duplicates)].join(", "));
  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt\s*=\s*["']/i.test(image[0])) fail("Image missing alt text in " + relative(file));
  }
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    checkReference(match[1], file, "HTML link");
  }
}
for (const file of files.filter(file => file.endsWith(".css"))) {
  const css = fs.readFileSync(file, "utf8");
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    checkReference(match[1], file, "CSS asset");
  }
}

const manifestPath = path.join(ROOT, "content/novels.json");
const catalogPath = path.join(ROOT, "catalog.json");
if (existsLocal(manifestPath) && existsLocal(catalogPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  if (!Array.isArray(manifest.novels) || !Array.isArray(catalog.novels)) {
    fail("Manifest and catalog must both contain novels arrays.");
  } else {
    const ids = manifest.novels.map(novel => novel.id);
    if (new Set(ids).size !== ids.length) fail("Manifest contains duplicate novel IDs.");
    if (catalog.novels.length !== manifest.novels.length) fail("Manifest and catalog novel counts differ.");
    for (const novel of manifest.novels) {
      const item = catalog.novels.find(entry => entry.id === novel.id);
      if (!item) { fail("Catalog is missing novel: " + novel.id); continue; }
      if (item.link !== novel.indexPath) fail("Catalog index path mismatch: " + novel.id);
      if (!existsLocal(path.join(ROOT, item.link))) fail("Novel page is missing: " + item.link);
      if (item.cover && !/^https?:\/\//i.test(item.cover) && !existsLocal(path.join(ROOT, item.cover))) {
        fail("Novel cover is missing: " + item.cover);
      }
      const chapterDir = path.join(ROOT, novel.contentDir);
      const sourceChapters = fs.existsSync(chapterDir)
        ? fs.readdirSync(chapterDir).filter(name => /^\d{3}\.md$/i.test(name))
        : [];
      if (sourceChapters.length !== item.chapters.length) {
        fail("Chapter count mismatch for " + novel.id + ": source=" + sourceChapters.length + ", catalog=" + item.chapters.length);
      }
      if (item.count !== item.chapters.length) fail("Catalog count field mismatch for " + novel.id);
      for (const chapter of item.chapters) {
        if (!existsLocal(path.join(ROOT, chapter.url))) fail("Generated chapter is missing: " + chapter.url);
      }
    }
  }
}

const sitemapPath = path.join(ROOT, "sitemap.xml");
if (existsLocal(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  if (!sitemap.includes("<urlset") || !sitemap.includes("</urlset>")) fail("Sitemap XML is incomplete.");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  for (const novel of catalog.novels) {
    if (!sitemap.includes(novel.link)) fail("Sitemap is missing novel: " + novel.link);
    for (const chapter of novel.chapters) if (!sitemap.includes(chapter.url)) fail("Sitemap is missing chapter: " + chapter.url);
  }
}

if (errors.length) {
  console.error("Project validation failed with " + errors.length + " issue(s):");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}
console.log("Project validation passed: JSON, JavaScript, CSS structure, local HTML/CSS references, novel catalog, covers, chapters, and sitemap.");
