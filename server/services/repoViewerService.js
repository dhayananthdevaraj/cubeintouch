
// // services/repoViewerService.js
// import dotenv from "dotenv";
// dotenv.config();

// const GITHUB_ORG   = "iamneo-production-2";
// const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// // ── Stack extensions ───────────────────────────────────────────────────────────

// const STACK_EXTENSIONS = {
//   "puppeteer":  ["html", "css", "js"],
//   "node-jest":  ["js", "ts"],
//   "react-jest": ["jsx", "tsx", "js", "ts"],
//   "karma":      ["ts", "js", "html"],
//   "junit":      ["java"],
//   "nunit":      ["cs"],
// };

// // ── Folders to always skip entirely ───────────────────────────────────────────

// const SKIP_FOLDERS = [
//   // JS/TS noise
//   "node_modules", ".git", "build", "dist", "coverage", "out",
//   // test folders — skip the whole folder
//   "__tests__", "__mocks__", "test", "tests", "spec", "specs",
//   "TestProject", "UnitTests", "IntegrationTests",          // ← dotnet test projects
//   // dotnet build output
//   "bin", "obj", "target", "Migrations",
//   // config/ide
//   ".config", "Properties", "wwwroot", ".vs", ".idea", ".vscode",
//   // test results
//   "TestResults",
// ];

// // ── File patterns to skip ──────────────────────────────────────────────────────

// const SKIP_FILE_PATTERNS = [
//   // JS/TS test files
//   /\.test\.(js|ts|jsx|tsx)$/i,
//   /\.spec\.(js|ts|jsx|tsx)$/i,

//   // Java test files
//   /Test\.java$/i,

//   // C# test files
//   /Tests\.cs$/i,
//   /Test\.cs$/i,
//   /Usings\.cs$/i,                    // ← dotnet test boilerplate
//   /UnitTest\d*\.cs$/i,               // ← UnitTest1.cs etc.

//   // Angular test
//   /Spec\.ts$/i,

//   // dotnet boilerplate (not student code)
//   /^WeatherForecast\.cs$/i,          // ← default ASP.NET template file
//   /^AssemblyInfo\.cs$/i,
//   /^GlobalUsings\.cs$/i,
//   /\.csproj$/i,
//   /\.sln$/i,

//   // java non-logic
//   /^module-info\.java$/i,

//   // react/node config noise
//   /^setupTests\./i,
//   /^reportWebVitals\./i,
//   /^jest\.config\./i,
//   /^babel\.config\./i,
//   /^webpack\.config\./i,
//   /^craco\.config\./i,
//   /^vite\.config\./i,
//   /^tailwind\.config\./i,
//   /^postcss\.config\./i,

//   // angular config
//   /^karma\.conf\./i,
//   /^protractor\.conf\./i,
//   /^angular\.json$/i,
//   /^polyfills\./i,

//   // package / lock files
//   /^package(-lock)?\.json$/i,
//   /^yarn\.lock$/i,
//   /^pnpm-lock\./i,
//   /^tsconfig/i,

//   // docs / misc
//   /^README/i,
//   /^CHANGELOG/i,
//   /^LICENSE/i,
//   /\.bak$/i,
//   /\.sql$/i,
//   /\.md$/i,
//   /\.json$/i,
// ];

// // ── GitHub helpers ─────────────────────────────────────────────────────────────

// async function listGitHubFolder(repoKey, folderPath) {
//   const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${folderPath}`;
//   const res = await fetch(url, {
//     headers: {
//       Authorization: `Bearer ${GITHUB_TOKEN}`,
//       Accept:        "application/vnd.github.v3+json",
//       "User-Agent":  "GoldenApp-ResultX",
//     },
//   });
//   if (!res.ok) return [];
//   const json = await res.json();
//   return Array.isArray(json) ? json : [];
// }

// async function fetchGitHubFile(repoKey, filePath) {
//   const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${filePath}`;
//   const res = await fetch(url, {
//     headers: {
//       Authorization: `Bearer ${GITHUB_TOKEN}`,
//       Accept:        "application/vnd.github.v3+json",
//       "User-Agent":  "GoldenApp-ResultX",
//     },
//   });
//   if (!res.ok) return null;
//   const json = await res.json();
//   return json.content ? Buffer.from(json.content, "base64").toString("utf-8") : null;
// }

// // ── Recursive file collector ───────────────────────────────────────────────────

// async function collectAllSourceFiles(repoKey, folderPath, allowedExts, depth = 0) {
//   if (depth > 6) return [];

//   const items = await listGitHubFolder(repoKey, folderPath);
//   const files = [];

//   for (const item of items) {
//     if (item.type === "dir") {
//       // Skip entire noise/test folders
//       if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) {
//         console.log(`  ⏭  Skipping folder: ${item.path}`);
//         continue;
//       }
//       const subFiles = await collectAllSourceFiles(repoKey, item.path, allowedExts, depth + 1);
//       files.push(...subFiles);
//       continue;
//     }

//     if (item.type !== "file") continue;

//     const ext  = item.name.split(".").pop()?.toLowerCase();
//     const name = item.name;

//     if (!allowedExts.includes(ext)) continue;
//     if (SKIP_FILE_PATTERNS.some(p => p.test(name))) {
//       console.log(`  ⏭  Skipping file: ${item.path}`);
//       continue;
//     }
//     if (item.size > 150000) continue;

//     files.push({ path: item.path, name, size: item.size });
//   }

//   return files;
// }

// // ── Priority sort ──────────────────────────────────────────────────────────────

// const PRIORITY_KEYWORDS = [
//   "controller", "model", "program", "context", "dbcontext",
//   "service", "repository", "interface", "exception",
//   "Controller", "Service", "Repository", "Entity", "Application", "Config", "Exception",
//   "App", "index", "api", "routes", "router", "store", "hook", "slice",
//   "server", "app", "middleware",
//   "component", "module", "guard",
// ];

// function scoreFile(filePath) {
//   const lower = filePath.toLowerCase();
//   for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
//     if (lower.includes(PRIORITY_KEYWORDS[i].toLowerCase())) return 1000 - i;
//   }
//   return 0;
// }

// // ── Build folder tree for sidebar ─────────────────────────────────────────────
// // Returns: [ { folder: "dotnetapp/Controllers", files: [...] }, ... ]

// function buildFolderTree(files) {
//   const folderMap = new Map();

//   for (const file of files) {
//     const parts     = file.path.split("/");
//     const folderKey = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
//     if (!folderMap.has(folderKey)) folderMap.set(folderKey, []);
//     folderMap.get(folderKey).push(file);
//   }

//   // Sort folders alphabetically, (root) last
//   const sorted = [...folderMap.entries()].sort(([a], [b]) => {
//     if (a === "(root)") return 1;
//     if (b === "(root)") return -1;
//     return a.localeCompare(b);
//   });

//   return sorted.map(([folder, folderFiles]) => ({
//     folder,
//     displayName: folder === "(root)" ? "(root)" : folder.split("/").pop(),
//     fullPath:    folder,
//     files:       folderFiles,
//   }));
// }

// // ── Main export ────────────────────────────────────────────────────────────────

// export async function getRepoFiles({ repoKey, techStack }) {
//   const allowedExts = STACK_EXTENSIONS[techStack] || ["js"];

//   console.log(`\n  📂 Viewer: full scan "${repoKey}" [stack: ${techStack}]`);

//   // Scan entire repo from root — captures all folders
//   const fileList = await collectAllSourceFiles(repoKey, "", allowedExts);

//   if (fileList.length === 0) {
//     throw new Error(`No ${allowedExts.join("/")} source files found in repository`);
//   }

//   // Sort: important files first, then alphabetical
//   fileList.sort((a, b) => {
//     const scoreDiff = scoreFile(b.path) - scoreFile(a.path);
//     if (scoreDiff !== 0) return scoreDiff;
//     return a.path.localeCompare(b.path);
//   });

//   console.log(`  ✅ Source files (${fileList.length}):`);
//   fileList.forEach(f => console.log(`     ${f.path}`));

//   // Fetch contents — cap at 30
//   const files = [];
//   for (const file of fileList.slice(0, 30)) {
//     const content = await fetchGitHubFile(repoKey, file.path);
//     if (content) {
//       files.push({
//         path:    file.path,
//         name:    file.name,
//         content,
//         size:    file.size,
//       });
//     }
//   }

//   if (files.length === 0) {
//     throw new Error("Could not read any source files from repository");
//   }

//   // Build folder tree for sidebar grouping
//   const folderTree = buildFolderTree(files);

//   console.log(`  📁 Folder tree:`);
//   folderTree.forEach(f => console.log(`     ${f.folder}/ (${f.files.length} files)`));

//   return {
//     success:    true,
//     repoKey,
//     techStack,
//     files,          // flat list for tab bar and content
//     folderTree,     // grouped for sidebar tree view
//     total:      files.length,
//   };
// }

// services/repoViewerService.js
import dotenv from "dotenv";
dotenv.config();

const GITHUB_ORG   = "iamneo-production-2";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// ── Stack extensions ───────────────────────────────────────────────────────────

const STACK_EXTENSIONS = {
  "puppeteer":  ["html", "css", "js"],
  "node-jest":  ["js", "ts"],
  "react-jest": ["jsx", "tsx", "js", "ts"],
  "karma":      ["ts", "js", "html"],
  "junit":      ["java"],
  "nunit":      ["cs"],
};

// ── Folders to always skip entirely ───────────────────────────────────────────

const SKIP_FOLDERS = [
  "node_modules", ".git", "build", "dist", "coverage", "out",
  "__tests__", "__mocks__", "test", "tests", "spec", "specs",
  "TestProject", "UnitTests", "IntegrationTests",
  "bin", "obj", "target", "Migrations",
  ".config", "Properties", "wwwroot", ".vs", ".idea", ".vscode",
  "TestResults", ".mvn", "resources",
];

// ── File patterns to skip ──────────────────────────────────────────────────────

const SKIP_FILE_PATTERNS = [
  /\.test\.(js|ts|jsx|tsx)$/i,
  /\.spec\.(js|ts|jsx|tsx)$/i,
  /Test\.java$/i,
  /Tests\.cs$/i,
  /Test\.cs$/i,
  /Usings\.cs$/i,
  /UnitTest\d*\.cs$/i,
  /Spec\.ts$/i,
  /^WeatherForecast\.cs$/i,
  /^AssemblyInfo\.cs$/i,
  /^GlobalUsings\.cs$/i,
  /\.csproj$/i,
  /\.sln$/i,
  /^module-info\.java$/i,
  /^setupTests\./i,
  /^reportWebVitals\./i,
  /^jest\.config\./i,
  /^babel\.config\./i,
  /^webpack\.config\./i,
  /^craco\.config\./i,
  /^vite\.config\./i,
  /^tailwind\.config\./i,
  /^postcss\.config\./i,
  /^karma\.conf\./i,
  /^protractor\.conf\./i,
  /^angular\.json$/i,
  /^polyfills\./i,
  /^package(-lock)?\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\./i,
  /^tsconfig/i,
  /^README/i,
  /^CHANGELOG/i,
  /^LICENSE/i,
  /\.bak$/i,
  /\.sql$/i,
  /\.md$/i,
  /\.json$/i,
];

// ── GitHub helpers ─────────────────────────────────────────────────────────────

async function listGitHubFolder(repoKey, folderPath) {
  const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${folderPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept:        "application/vnd.github.v3+json",
      "User-Agent":  "GoldenApp-ResultX",
    },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

async function fetchGitHubFile(repoKey, filePath) {
  const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${filePath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept:        "application/vnd.github.v3+json",
      "User-Agent":  "GoldenApp-ResultX",
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.content ? Buffer.from(json.content, "base64").toString("utf-8") : null;
}

// ── Deep Java source finder ────────────────────────────────────────────────────
// Walks src/main/java/<com>/<org>/<appname>/ dynamically — no hardcoded names

async function findJavaSourceRoot(repoKey, appRoot) {
  const srcMainJava = [appRoot, "src/main/java"].filter(Boolean).join("/");

  async function walk(path, depth) {
    if (depth > 6) return path;
    const items = await listGitHubFolder(repoKey, path);
    if (!items.length) return path;

    // If .java files exist here, this is the source root
    if (items.some(i => i.type === "file" && i.name.endsWith(".java"))) {
      return path;
    }

    // Filter subdirs (skip test/target)
    const dirs = items.filter(i =>
      i.type === "dir" &&
      !SKIP_FOLDERS.some(s => i.name.toLowerCase() === s.toLowerCase())
    );

    if (dirs.length === 0) return path;

    // Single dir → keep descending (com → examly → appname)
    if (dirs.length === 1) return walk(dirs[0].path, depth + 1);

    // Multiple dirs → we've reached the package folders (controller, model, etc.)
    return path;
  }

  console.log(`  🔍 Walking Java source path from: ${srcMainJava}`);
  return walk(srcMainJava, 0);
}

// ── Discover app root ──────────────────────────────────────────────────────────

async function discoverAppRoot(repoKey, stack) {
  if (stack === "puppeteer") return "public";

  const rootItems = await listGitHubFolder(repoKey, "");

  // JUnit / NUnit: find any root folder that contains a src/ subdir
  if (stack === "junit" || stack === "nunit") {
    for (const item of rootItems) {
      if (item.type !== "dir") continue;
      if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;

      const subItems = await listGitHubFolder(repoKey, item.name);
      const hasSrc   = subItems.some(s => s.type === "dir" && s.name === "src");
      if (hasSrc) {
        console.log(`  🎯 App root: ${item.name}/`);
        return item.name;
      }
    }
    // Repo root itself might be the app root
    const rootHasSrc = rootItems.some(s => s.type === "dir" && s.name === "src");
    if (rootHasSrc) {
      console.log(`  🎯 App root: (repo root)`);
      return "";
    }
  }

  // JS/TS stacks: match known patterns
  const STACK_ROOT_PATTERNS = {
    "node-jest":  ["nodeapp", "node-app", "node_app", "backend", "server", "app"],
    "react-jest": ["reactapp", "react-app", "react_app", "frontend", "client", "app"],
    "karma":      ["angularapp", "angular-app", "angular_app", "frontend", "client", "app"],
  };

  const patterns = STACK_ROOT_PATTERNS[stack] || [];
  for (const item of rootItems) {
    if (item.type !== "dir") continue;
    const lower = item.name.toLowerCase();
    if (patterns.some(p => lower === p || lower.startsWith(p))) {
      console.log(`  🎯 App root: ${item.name}/`);
      return item.name;
    }
  }

  console.warn(`  ⚠️  Could not detect app root — using repo root`);
  return "";
}

// ── Recursive file collector ───────────────────────────────────────────────────

async function collectAllSourceFiles(repoKey, folderPath, allowedExts, depth = 0) {
  if (depth > 5) return [];

  const items = await listGitHubFolder(repoKey, folderPath);
  const files = [];

  for (const item of items) {
    if (item.type === "dir") {
      if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) {
        console.log(`  ⏭  Skipping folder: ${item.path}`);
        continue;
      }
      const subFiles = await collectAllSourceFiles(repoKey, item.path, allowedExts, depth + 1);
      files.push(...subFiles);
      continue;
    }

    if (item.type !== "file") continue;

    const ext  = item.name.split(".").pop()?.toLowerCase();
    const name = item.name;

    if (!allowedExts.includes(ext)) continue;
    if (SKIP_FILE_PATTERNS.some(p => p.test(name))) continue;
    if (item.size > 150000) continue;

    files.push({ path: item.path, name, size: item.size });
  }

  return files;
}

// ── Priority sort ──────────────────────────────────────────────────────────────

const PRIORITY_KEYWORDS = [
  "controller", "model", "program", "context", "dbcontext",
  "service", "repository", "interface", "exception",
  "Controller", "Service", "Repository", "Entity", "Application", "Config", "Exception",
  "App", "index", "api", "routes", "router", "store", "hook", "slice",
  "server", "app", "middleware",
  "component", "module", "guard",
];

function scoreFile(filePath) {
  const lower = filePath.toLowerCase();
  for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
    if (lower.includes(PRIORITY_KEYWORDS[i].toLowerCase())) return 1000 - i;
  }
  return 0;
}

// ── Build folder tree for sidebar ─────────────────────────────────────────────

function buildFolderTree(files) {
  const folderMap = new Map();

  for (const file of files) {
    const parts     = file.path.split("/");
    const folderKey = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
    if (!folderMap.has(folderKey)) folderMap.set(folderKey, []);
    folderMap.get(folderKey).push(file);
  }

  const sorted = [...folderMap.entries()].sort(([a], [b]) => {
    if (a === "(root)") return 1;
    if (b === "(root)") return -1;
    return a.localeCompare(b);
  });

  return sorted.map(([folder, folderFiles]) => ({
    folder,
    displayName: folder === "(root)" ? "(root)" : folder.split("/").pop(),
    fullPath:    folder,
    files:       folderFiles,
  }));
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function getRepoFiles({ repoKey, techStack }) {
  const allowedExts = STACK_EXTENSIONS[techStack] || ["js"];

  console.log(`\n  📂 Viewer: "${repoKey}" [stack: ${techStack}]`);

  // Step 1: Discover app root
  const appRoot = await discoverAppRoot(repoKey, techStack);

  // Step 2: Determine scan path based on stack
  let scanPath;

  if (techStack === "junit") {
    // Walk deep: src/main/java/com/examly/<appname>/
    scanPath = await findJavaSourceRoot(repoKey, appRoot);
    console.log(`  📂 Java source root: "${scanPath}"`);

  } else if (techStack === "nunit") {
    // .NET: scan from app root, collector handles depth
    scanPath = appRoot;

  } else if (techStack === "karma") {
    // Angular: src/ inside app root
    scanPath = [appRoot, "src"].filter(Boolean).join("/");

  } else if (techStack === "react-jest") {
    // React: src/ inside app root
    scanPath = [appRoot, "src"].filter(Boolean).join("/");

  } else if (techStack === "node-jest") {
    // Node: try src/ first, fall back to app root
    const trySrc   = [appRoot, "src"].filter(Boolean).join("/");
    const srcItems = await listGitHubFolder(repoKey, trySrc);
    scanPath = srcItems.length > 0 ? trySrc : appRoot;

  } else {
    // puppeteer and others
    scanPath = appRoot;
  }

  // Step 3: Collect source files from resolved path
  let fileList = await collectAllSourceFiles(repoKey, scanPath, allowedExts);

  // Step 4: Fallback — full repo scan
  if (fileList.length === 0) {
    console.warn(`  ⚠️  No files in "${scanPath}" — falling back to full repo scan`);
    fileList = await collectAllSourceFiles(repoKey, "", allowedExts);
  }

  if (fileList.length === 0) {
    throw new Error(`No ${allowedExts.join("/")} source files found in repository`);
  }

  // Step 5: Sort by priority
  fileList.sort((a, b) => {
    const scoreDiff = scoreFile(b.path) - scoreFile(a.path);
    if (scoreDiff !== 0) return scoreDiff;
    return a.path.localeCompare(b.path);
  });

  console.log(`  ✅ Found ${fileList.length} source file(s):`);
  fileList.forEach(f => console.log(`     ${f.path}`));

  // Step 6: Fetch contents — cap at 30
  const files = [];
  for (const file of fileList.slice(0, 30)) {
    const content = await fetchGitHubFile(repoKey, file.path);
    if (content) {
      files.push({ path: file.path, name: file.name, content, size: file.size });
    }
  }

  if (files.length === 0) {
    throw new Error("Could not read any source files from repository");
  }

  // Step 7: Build folder tree for sidebar
  const folderTree = buildFolderTree(files);

  console.log(`  📁 Folder tree:`);
  folderTree.forEach(f => console.log(`     ${f.folder}/ (${f.files.length} files)`));

  return {
    success:    true,
    repoKey,
    techStack,
    files,
    folderTree,
    total:      files.length,
  };
}