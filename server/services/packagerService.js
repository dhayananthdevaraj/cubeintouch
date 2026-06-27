// server/services/packagerService.js
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPTS_DIR = path.join(__dirname, "..", "scripts");
const VALID_STACKS = ["pytest", "junit", "nunit"];

const IS_WINDOWS = process.platform === "win32";

function toWslPath(p) {
  return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);
}

function shell(cmd, options = {}) {
  const finalCmd = IS_WINDOWS ? `wsl bash -c "${cmd.replace(/"/g, '\\"')}"` : cmd;
  return execSync(finalCmd, { stdio: "pipe", timeout: 120_000, ...options });
}

function ensureZipInstalled() {
  if (!IS_WINDOWS) return;
  try {
    execSync(`wsl bash -c "which zip"`, { stdio: "pipe" });
  } catch {
    console.log("[packager] Installing zip in WSL...");
    execSync(`wsl bash -c "sudo apt-get install -y zip unzip"`, { stdio: "pipe" });
  }
}

/**
 * Detect if a folder contains junit/ (or pytest/ or nunit/) directly
 * meaning it is a project-level folder ready for packaging
 */
function hasStackFolder(dir, stack) {
  const stackFolder = stack === "pytest" ? "pytest" : stack === "nunit" ? "nunit" : "junit";
  return fs.existsSync(path.join(dir, stackFolder)) &&
         fs.statSync(path.join(dir, stackFolder)).isDirectory();
}

/**
 * Run packaging script inside a single project folder
 * e.g. .../JDBCzip/warehousecargo/  which has junit/ + warehousecargoapp/
 */
function runScriptInFolder(folderPath, scriptContent, stack) {
  console.log(`[packager] Processing: ${path.basename(folderPath)}`);
  const folderSh = IS_WINDOWS ? toWslPath(folderPath) : folderPath;

  // Write script into folder
  const scriptPath = path.join(folderPath, "script.sh");
  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  // Run script — it will do cd.. internally and produce a zip there
  // We don't want that zip, we just want the packaged junit/ folder in place
  shell(`cd '${folderSh}' && bash script.sh`);

  // Clean up any stray zip the script produced one level up
  const parentDir = path.dirname(folderPath);
  const strayZip = path.join(parentDir, `${stack}.zip`);
  if (fs.existsSync(strayZip)) {
    fs.unlinkSync(strayZip);
    console.log(`[packager] Cleaned up stray zip in: ${path.basename(parentDir)}`);
  }
}

/**
 * @param {string} stack        - "pytest" | "junit" | "nunit"
 * @param {Buffer} buffer       - raw bytes of uploaded .zip
 * @param {string} originalName - original zip filename e.g. "JDBCzip.zip"
 */
export async function runPackager(stack, buffer, originalName) {
  if (!VALID_STACKS.includes(stack)) {
    throw new Error(`Invalid stack "${stack}". Valid: ${VALID_STACKS.join(", ")}`);
  }

  const scriptSrc = path.join(SCRIPTS_DIR, `${stack}.sh`);
  if (!fs.existsSync(scriptSrc)) {
    throw new Error(`Script not found: ${scriptSrc}`);
  }
  const scriptContent = fs.readFileSync(scriptSrc);

  ensureZipInstalled();

  // Temp dir structure:
  // parentDir/
  //   extract/         ← zip extracted here (preserves JDBCzip/ wrapper)
  const parentDir = fs.mkdtempSync(path.join(os.tmpdir(), `pkg-`));
  const extractDir = path.join(parentDir, "extract");
  fs.mkdirSync(extractDir);

  const cleanup = () => {
    try { fs.rmSync(parentDir, { recursive: true, force: true }); } catch {}
  };

  const extractDirSh = IS_WINDOWS ? toWslPath(extractDir) : extractDir;

  try {
    // Extract zip — preserves full structure including JDBCzip/ wrapper
    const uploadedZip = path.join(parentDir, "upload.zip");
    fs.writeFileSync(uploadedZip, buffer);
    const uploadedZipSh = IS_WINDOWS ? toWslPath(uploadedZip) : uploadedZip;
    shell(`unzip -q '${uploadedZipSh}' -d '${extractDirSh}'`);
    fs.unlinkSync(uploadedZip);

    // extractDir now has:
    // extract/
    //   JDBCzip/
    //     warehousecargo/
    //     blookbankapp/
    //     spacemissionapp/

    // Get top-level entries (should be just the wrapper folder e.g. JDBCzip/)
    const topEntries = fs.readdirSync(extractDir).filter(e => !e.startsWith('.'));
    console.log(`[packager] Top-level entries: ${topEntries.join(', ')}`);

    for (const topEntry of topEntries) {
      const topPath = path.join(extractDir, topEntry);
      if (!fs.statSync(topPath).isDirectory()) continue;

      // Check if topEntry itself is a project folder (single-folder mode)
      if (hasStackFolder(topPath, stack)) {
        console.log(`[packager] Single-folder mode: ${topEntry}`);
        runScriptInFolder(topPath, scriptContent, stack);
      } else {
        // Multi-folder mode — each subfolder is a project folder
        const subFolders = fs.readdirSync(topPath).filter(e => {
          if (e.startsWith('.')) return false;
          return fs.statSync(path.join(topPath, e)).isDirectory();
        });
        console.log(`[packager] Multi-folder mode: ${subFolders.length} projects in ${topEntry}/`);

        for (const sub of subFolders) {
          const subPath = path.join(topPath, sub);
          if (hasStackFolder(subPath, stack)) {
            runScriptInFolder(subPath, scriptContent, stack);
          } else {
            console.log(`[packager] Skipping ${sub}/ — no ${stack} folder found`);
          }
        }
      }
    }

    // Zip everything in extractDir back with the original zip name
    const zipName = originalName || `${stack}_packaged.zip`;
    const zipPath = path.join(parentDir, zipName);
    const zipPathSh = IS_WINDOWS ? toWslPath(zipPath) : zipPath;

    // cd into extractDir and zip all contents preserving structure
    shell(`cd '${extractDirSh}' && zip -r '${zipPathSh}' .`);

    if (!fs.existsSync(zipPath)) {
      throw new Error(`Output zip not produced: ${zipPath}`);
    }

    console.log(`[packager] Done → ${zipName}`);
    return { zipPath, zipName, cleanup };

  } catch (err) {
    cleanup();
    const detail = err.stderr?.toString().trim() || err.message;
    throw new Error(detail);
  }
}

// =========================================================
// getZipTree — parse zip and return folder tree for preview
// =========================================================
import AdmZip from "adm-zip";

export async function getZipTree(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().map(e => e.entryName);

  // Build tree object
  const root = {};
  for (const entry of entries) {
    const parts = entry.replace(/\/$/, "").split("/");
    let node = root;
    for (const part of parts) {
      if (!node[part]) node[part] = {};
      node = node[part];
    }
  }

  // Convert to array tree for frontend
  function toTree(obj, name = "root") {
    const children = Object.keys(obj).map(k => toTree(obj[k], k));
    const isFile = children.length === 0;
    return { name, isFile, children: isFile ? undefined : children };
  }

  return toTree(root).children || [];
}