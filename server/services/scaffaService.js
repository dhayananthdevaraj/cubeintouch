// server/services/scaffaService.js
import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Template dirs ─────────────────────────────────────────────────────────────
const templateDir   = path.join(__dirname, "../template");
const reactDir      = path.join(templateDir, "react");
const reactAppDir   = path.join(templateDir, "reactapp");
const angularAppDir = path.join(templateDir, "angularapp");
const karmaDir      = path.join(templateDir, "karma");

// ── GitHub config ─────────────────────────────────────────────────────────────
const GITHUB_ORG   = process.env.GITHUB_ORG   || "iamneo-production";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract repo key from examly.io workspace URL */
function extractRepoKey(githubUrl) {
  const match = githubUrl.match(/https?:\/\/\d{4}-([\w\d]+)\.premiumproject\.examly\.io/);
  if (!match) throw new Error("Invalid examly.io URL format");
  return match[1];
}

/** GitHub API — list folder contents */
async function listGitHubFolder(repoKey, folderPath = "") {
  const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${folderPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept:        "application/vnd.github.v3+json",
      "User-Agent":  "Scaffa-SupportHub",
    },
  });
  if (!res.ok) {
    console.warn(`⚠️  GitHub API ${res.status} for ${folderPath}`);
    return [];
  }
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/** GitHub API — fetch single file content as utf-8 string */
async function fetchGitHubFile(repoKey, filePath) {
  const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${filePath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept:        "application/vnd.github.v3+json",
      "User-Agent":  "Scaffa-SupportHub",
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.content ? Buffer.from(json.content, "base64").toString("utf-8") : null;
}

/** Recursively collect files matching extensions under a folder */
async function collectSpecFiles(repoKey, folderPath, extensions = [".spec.ts"]) {
  const items     = await listGitHubFolder(repoKey, folderPath);
  const specFiles = [];

  for (const item of items) {
    if (item.type === "file") {
      const matches = extensions.some((ext) => item.name.endsWith(ext));
      if (matches) {
        const content = await fetchGitHubFile(repoKey, item.path);
        if (content) specFiles.push({ name: item.path, content });
      }
    } else if (item.type === "dir") {
      const nested = await collectSpecFiles(repoKey, item.path, extensions);
      specFiles.push(...nested);
    }
  }

  return specFiles;
}
function extractTestNames(content) {
  const regex = /(?:fit|it)\s*\(\s*['"`](.*?)['"`]\s*,/g;
  const names = [];
  let match;
  while ((match = regex.exec(content)) !== null) names.push(match[1]);
  return names;
}

/** Build karma.sh script */
function buildKarmaScript(files, testNamesMap) {
  let script = [
    "#!/bin/bash",
    `export NVM_DIR="/usr/local/nvm"`,
    `[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"`,
    "nvm use 14",
    "export CHROME_BIN=/usr/bin/chromium",
    "",
    `if [ ! -d "/home/coder/project/workspace/angularapp" ]; then`,
    `    cp -r /home/coder/project/workspace/karma/angularapp /home/coder/project/workspace/;`,
    `fi`,
    "",
    `if [ -d "/home/coder/project/workspace/angularapp" ]; then`,
    `    echo "project folder present"`,
    `    cp /home/coder/project/workspace/karma/karma.conf.js /home/coder/project/workspace/angularapp/karma.conf.js;`,
  ].join("\n");

  for (const file of files) {
    const base      = file.originalname.replace(".spec.ts", "");
    const testNames = testNamesMap[file.originalname] || [];
    const failLines = testNames.map((n) => `        echo "${n} FAILED";`).join("\n");

    if (file.originalname.endsWith(".model.spec.ts")) {
      const model = base.replace(".model", "");
      script += `
    if [ -e "/home/coder/project/workspace/angularapp/src/app/models/${model}.model.ts" ]; then
        cp /home/coder/project/workspace/karma/${file.originalname} /home/coder/project/workspace/angularapp/src/app/models/${model}.model.spec.ts;
    else
${failLines}
    fi
`;
    }

    if (file.originalname.endsWith(".service.spec.ts")) {
      const svc = base.replace(".service", "");
      script += `
    if [ -e "/home/coder/project/workspace/angularapp/src/app/services/${svc}.service.ts" ]; then
        cp /home/coder/project/workspace/karma/${file.originalname} /home/coder/project/workspace/angularapp/src/app/services/${svc}.service.spec.ts;
    else
${failLines}
    fi
`;
    }

    if (file.originalname.endsWith(".component.spec.ts")) {
      const comp = base.replace(".component", "");
      script += `
    if [ -d "/home/coder/project/workspace/angularapp/src/app/components/${comp}" ]; then
        cp /home/coder/project/workspace/karma/${file.originalname} /home/coder/project/workspace/angularapp/src/app/components/${comp}/${file.originalname};
    else
${failLines}
    fi
`;
    }
  }

  script += `
    if [ -d "/home/coder/project/workspace/angularapp/node_modules" ]; then
        cd /home/coder/project/workspace/angularapp/
        npm test;
    else
        cd /home/coder/project/workspace/angularapp/
        yes | npm install
        npm test
    fi
else
`;

  // Fallback fail logs when angularapp dir missing
  for (const file of files) {
    const testNames = testNamesMap[file.originalname] || [];
    testNames.forEach((n) => { script += `    echo "${n} FAILED";\n`; });
  }

  script += `fi\n`;
  return script;
}

// ── Exported service functions ────────────────────────────────────────────────

/**
 * List direct subfolders of a given path in the repo
 */
export async function fetchFolders(githubUrl, folderPath = "") {
  const repoKey = extractRepoKey(githubUrl);
  const items   = await listGitHubFolder(repoKey, folderPath);
  return items.filter((i) => i.type === "dir").map((i) => i.name);
}

/**
 * Recursively find and return test files under folderName
 * @param {string} type - "angular" → .spec.ts | "react" → .test.js/.test.ts/.spec.js/.spec.ts
 * Returns: [{ name, content }]
 */
export async function fetchSpecFiles(githubUrl, folderName, type = "angular") {
  const repoKey = extractRepoKey(githubUrl);

  const EXTENSIONS = {
    angular: [".spec.ts"],
    react:   [".test.js", ".test.ts", ".test.jsx", ".test.tsx", ".spec.js", ".spec.ts"],
  };

  const extensions = EXTENSIONS[type] || EXTENSIONS.angular;
  console.log(`  🔍 fetchSpecFiles [${type}] — extensions: ${extensions.join(", ")}`);

  return collectSpecFiles(repoKey, folderName, extensions);
}

/**
 * Generate React scaffold ZIP
 * Returns: zipFilePath (string) — caller sends as download
 */
export async function generateReactZip(testCase, zipFileName) {
  const tempDir         = await fs.mkdtemp(path.join(os.tmpdir(), "scaffa-react-"));
  const tempReactDir    = path.join(tempDir, "react");
  const tempReactAppDir = path.join(tempDir, "reactapp");

  await fs.copy(reactDir,    tempReactDir);
  await fs.copy(reactAppDir, tempReactAppDir);

  const testsDir = path.join(tempReactDir, "tests");
  const srcDir   = path.join(tempReactAppDir, "src");
  await fs.ensureDir(testsDir);
  await fs.ensureDir(srcDir);

  // Write test file
  await fs.writeFile(path.join(testsDir, "App.test.js"), testCase, "utf8");

  // Auto-create component stubs from import statements
  const componentRegex = /import\s+(\w+)\s+from\s+['"`]\.\.\/components\/([\w\/]+)['"`]/g;
  for (const match of [...testCase.matchAll(componentRegex)]) {
    const componentPath = path.join(srcDir, `components/${match[2]}.jsx`);
    await fs.outputFile(componentPath, `// ${match[1]} component stub\n`, "utf8");
    console.log(`  ✅ Component stub: ${match[2]}.jsx`);
  }

  // Build ZIP
  const zipPath = path.join(tempDir, `${zipFileName}.zip`);
  await buildZip(zipPath, [
    { dir: tempReactDir,    name: `${zipFileName}/react` },
    { dir: tempReactAppDir, name: `${zipFileName}/reactapp` },
  ]);

  console.log(`✅ React ZIP ready: ${zipFileName}.zip`);
  return { zipPath, tempDir };
}

/**
 * Generate Angular scaffold ZIP with karma.sh
 * Returns: zipFilePath (string) — caller sends as download
 */
export async function generateAngularZip(files, zipFileName) {
  const tempDir           = await fs.mkdtemp(path.join(os.tmpdir(), "scaffa-angular-"));
  const tempAngularAppDir = path.join(tempDir, "angularapp");
  const tempKarmaDir      = path.join(tempDir, "karma");

  await fs.copy(angularAppDir, tempAngularAppDir);
  await fs.copy(karmaDir,      tempKarmaDir);

  // Write uploaded spec files + collect test names
  const testNamesMap = {};
  for (const file of files) {
    await fs.writeFile(path.join(tempKarmaDir, file.originalname), file.buffer);
    testNamesMap[file.originalname] = extractTestNames(file.buffer.toString());
    console.log(`  ✅ Spec file: ${file.originalname} (${testNamesMap[file.originalname].length} tests)`);
  }

  // Generate karma.sh
  const karmaScript = buildKarmaScript(files, testNamesMap);
  await fs.writeFile(path.join(tempKarmaDir, "karma.sh"), karmaScript, "utf8");
  console.log(`  ✅ karma.sh generated`);

  // Build ZIP
  const zipPath = path.join(tempDir, `${zipFileName}.zip`);
  await buildZip(zipPath, [
    { dir: tempAngularAppDir, name: `${zipFileName}/angularapp` },
    { dir: tempKarmaDir,      name: `${zipFileName}/karma` },
  ]);

  console.log(`✅ Angular ZIP ready: ${zipFileName}.zip`);
  return { zipPath, tempDir };
}

// ── ZIP builder helper ────────────────────────────────────────────────────────

function buildZip(zipPath, dirs) {
  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    archive.on("error", reject);

    archive.pipe(output);
    dirs.forEach(({ dir, name }) => archive.directory(dir, name));
    archive.finalize();
  });
}