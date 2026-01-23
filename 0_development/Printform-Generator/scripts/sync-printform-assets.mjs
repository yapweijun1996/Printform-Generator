import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, mkdir, stat, readdir } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Copy printform.js to public/
const sourcePath = path.join(repoRoot, 'printform-js', 'printform.js');
const targetDir = path.join(repoRoot, 'public');
const targetPath = path.join(targetDir, 'printform.js');

await stat(sourcePath);
await mkdir(targetDir, { recursive: true });
await copyFile(sourcePath, targetPath);

console.log(`[sync-printform-assets] Copied to public: ${path.relative(repoRoot, targetPath)}`);

// Copy HTML example files to public/printform-js/
const sourceDir = path.join(repoRoot, 'printform-js');
const targetExamplesDir = path.join(repoRoot, 'public', 'printform-js');

await mkdir(targetExamplesDir, { recursive: true });

const files = await readdir(sourceDir);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

let copiedCount = 0;
for (const htmlFile of htmlFiles) {
  const src = path.join(sourceDir, htmlFile);
  const dest = path.join(targetExamplesDir, htmlFile);
  await copyFile(src, dest);
  copiedCount++;
}

console.log(`[sync-printform-assets] Copied ${copiedCount} HTML examples to public/printform-js/`);
