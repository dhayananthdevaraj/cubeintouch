// services/resultAnalysisService.js
import { llmCall } from "./llmQueue.js";
import dotenv from "dotenv";

dotenv.config();

const GITHUB_ORG   = "iamneo-production-2";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// ── Stack Contexts ─────────────────────────────────────────────────────────────

const STACK_CONTEXT = {
  "puppeteer":  "This is a web project tested with Puppeteer. Focus on HTML structure, CSS styling, and JavaScript DOM interactions.",
  "node-jest":  "This is a Node.js backend project tested with Jest. Focus on module exports, function logic, async handling, and route handlers.",
  "react-jest": "This is a React project tested with React Testing Library + Jest. Focus on component structure, props, state management, and rendering logic.",
  "karma":      "This is an Angular project tested with Karma. Focus on component logic, services, dependency injection, and test spec correctness.",
  "junit":      "This is a Java Spring Boot project tested with JUnit. Focus on class structure, method implementations, exception handling, and Spring annotations.",
  "nunit":      "This is a .NET/C# project tested with NUnit. Focus on model classes, controller actions, DbContext configuration, and dependency injection.",
  "pytest":     "This is a Python project tested with Pytest. Focus on function logic, class methods, module structure, return values, exception handling, and correct use of Python conventions.",
};

const STACK_EXTENSIONS = {
  "puppeteer":  ["html", "css", "js"],
  "node-jest":  ["js", "ts"],
  "react-jest": ["jsx", "tsx", "js", "ts"],
  "karma":      ["ts", "js", "html"],
  "junit":      ["java"],
  "nunit":      ["cs"],
  "pytest":     ["py"],
};

const SKIP_FOLDERS = [
  "node_modules", ".git", "build", "dist", "coverage", "out",
  "__tests__", "__mocks__", "test", "tests", "spec", "specs",
  "bin", "obj", "target", "Migrations",
  ".config", "Properties", "wwwroot", ".vs", ".idea", ".vscode",
  "TestResults", ".mvn","__pycache__", ".pytest_cache", "venv", ".venv", "env",
  "migrations", "static", "media", "htmlcov",
];

const SKIP_FILE_PATTERNS = [
  /\.test\.(js|ts|jsx|tsx)$/i,
  /\.spec\.(js|ts|jsx|tsx)$/i,
  /Test\.java$/i,
  /Tests\.cs$/i,
  /Spec\.ts$/i,
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
  /^\.browserslistrc$/i,
  /^polyfills\./i,
  /\.csproj$/i,
  /\.sln$/i,
  /^AssemblyInfo\.cs$/i,
  /^GlobalUsings\.cs$/i,
  /^module-info\.java$/i,
  /\.pom$/i,
  /^\.eslint/i,
  /^\.prettier/i,
  /^\.stylelint/i,
  /^package(-lock)?\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\./i,
  /^tsconfig/i,
  /^README/i,
  /^CHANGELOG/i,
  /^LICENSE/i,
  /^test_.*\.py$/i,
  /.*_test\.py$/i,
  /^conftest\.py$/i,
  /^setup\.py$/i,
  /^setup\.cfg$/i,
  /^pyproject\.toml$/i,
  /^requirements.*\.txt$/i,
  /^__init__\.py$/i,
];

const PRIORITY_KEYWORDS = [
  "controller", "model", "program", "context", "dbcontext",
  "service", "repository", "interface", "exception",
  "Controller", "Service", "Repository", "Entity", "Application", "Config", "Exception",
  "App", "index", "api", "routes", "router", "store", "context", "hook", "slice",
  "server", "app", "middleware",
  "component", "module", "guard",
  "main", "app", "routes", "views", "models", "schemas",
  "utils", "helpers", "database", "db", "config", "settings",
  "manager", "handler", "client", "server",
];

function scoreFile(filePath) {
  const lower = filePath.toLowerCase();
  for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
    if (lower.includes(PRIORITY_KEYWORDS[i].toLowerCase())) return 1000 - i;
  }
  return 0;
}

// ── GitHub helpers ─────────────────────────────────────────────────────────────

async function fetchGitHubFile(repoKey, filePath) {
  const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${filePath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GoldenApp-ResultX",
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.content ? Buffer.from(json.content, "base64").toString("utf-8") : null;
}

async function listGitHubFolder(repoKey, folderPath) {
  const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${folderPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GoldenApp-ResultX",
    },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

async function findJavaSourceRoot(repoKey, appRoot) {
  const srcMainJava = [appRoot, "src/main/java"].filter(Boolean).join("/");

  async function walkToJava(path, depth) {
    if (depth > 6) return path;
    const items = await listGitHubFolder(repoKey, path);
    if (!items.length) return path;
    if (items.some(i => i.type === "file" && i.name.endsWith(".java"))) return path;
    const dirs = items.filter(i =>
      i.type === "dir" &&
      !SKIP_FOLDERS.some(s => i.name.toLowerCase() === s.toLowerCase())
    );
    if (dirs.length === 0) return path;
    if (dirs.length === 1) return walkToJava(dirs[0].path, depth + 1);
    return path;
  }

  console.log(`  🔍 Walking Java source path from: ${srcMainJava}`);
  return walkToJava(srcMainJava, 0);
}

async function discoverAppRoot(repoKey, stack) {
  if (stack === "puppeteer") return "public";

  const rootItems = await listGitHubFolder(repoKey, "");

  if (stack === "junit" || stack === "nunit") {
    for (const item of rootItems) {
      if (item.type !== "dir") continue;
      if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
      const subItems = await listGitHubFolder(repoKey, item.name);
      const hasSrc   = subItems.some(s => s.type === "dir" && s.name === "src");
      if (hasSrc) {
        console.log(`  🎯 Discovered app root: ${item.name}/`);
        return item.name;
      }
    }
    const rootHasSrc = rootItems.some(s => s.type === "dir" && s.name === "src");
    if (rootHasSrc) { console.log(`  🎯 App root is repo root`); return ""; }
  }

  // ── Pytest: find subfolder with .py source files ──
  if (stack === "pytest") {
    for (const item of rootItems) {
      if (item.type !== "dir") continue;
      if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
      const subItems = await listGitHubFolder(repoKey, item.name);
      const hasPy    = subItems.some(s => s.type === "file" && s.name.endsWith(".py"));
      if (hasPy) {
        console.log(`  🎯 Discovered Python app root: ${item.name}/`);
        return item.name;
      }
    }
    const rootHasPy = rootItems.some(s => s.type === "file" && s.name.endsWith(".py"));
    if (rootHasPy) { console.log(`  🎯 Python app root is repo root`); return ""; }
  }

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
      console.log(`  🎯 Discovered app root: ${item.name}/`);
      return item.name;
    }
  }

  console.warn(`  ⚠️  Could not match a known app root. Falling back to repo root.`);
  return "";
}

async function collectSourceFiles(repoKey, folderPath, allowedExts, depth = 0) {
  if (depth > 4) return [];
  const items = await listGitHubFolder(repoKey, folderPath);
  const files = [];

  for (const item of items) {
    if (item.type === "dir") {
      if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
      const subFiles = await collectSourceFiles(repoKey, item.path, allowedExts, depth + 1);
      files.push(...subFiles);
      continue;
    }
    if (item.type !== "file") continue;
    const ext  = item.name.split(".").pop()?.toLowerCase();
    const name = item.name;
    if (!allowedExts.includes(ext)) continue;
    if (SKIP_FILE_PATTERNS.some(p => p.test(name))) continue;
    if (item.size > 80000) continue;
    files.push({ path: item.path, name });
  }

  return files;
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function analyzeStudentResult({
  repoKey,
  questionHtml,
  studentName,
  failedTestcases,
  techStack = "puppeteer",
}) {
  const allowedExts  = STACK_EXTENSIONS[techStack] || ["js"];
  const stackContext = STACK_CONTEXT[techStack]     || STACK_CONTEXT["puppeteer"];

  const appRoot = await discoverAppRoot(repoKey, techStack);

  let scanPath;
  if (techStack === "junit") {
    scanPath = await findJavaSourceRoot(repoKey, appRoot);
    console.log(`  📂 Java source root resolved to: "${scanPath}"`);
  } else if (techStack === "nunit") {
    scanPath = appRoot;
  } else if (techStack === "pytest") {
    scanPath = appRoot;
  } else {
    const tryWithSrc = [appRoot, "src"].filter(Boolean).join("/");
    const srcItems   = await listGitHubFolder(repoKey, tryWithSrc);
    scanPath = srcItems.length > 0 ? tryWithSrc : appRoot;
  }

  let fileList = await collectSourceFiles(repoKey, scanPath, allowedExts);
  if (fileList.length === 0) {
    console.warn(`  ⚠️  No files in "${scanPath}". Scanning full repo root...`);
    fileList = await collectSourceFiles(repoKey, "", allowedExts);
  }
  if (fileList.length === 0) {
    throw new Error(`No ${allowedExts.join("/")} source files found in repository`);
  }

  fileList.sort((a, b) => scoreFile(b.path) - scoreFile(a.path));
  const topFiles = fileList.slice(0, 12);
  console.log(`  📄 Top files: ${topFiles.map(f => f.path).join(", ")}`);

  const fileContents = [];
  for (const file of topFiles) {
    const content = await fetchGitHubFile(repoKey, file.path);
    if (content) {
      fileContents.push({ path: file.path, content: content.slice(0, 8000) });
    }
  }
  if (fileContents.length === 0) {
    throw new Error("Could not read any source files from repository");
  }

  const questionText = stripHtml(questionHtml);
  const failedTcText = failedTestcases.length > 0
    ? `\nFailed test cases: ${failedTestcases.join(", ")}`
    : "";
  const codeBlock = fileContents
    .map(f => `// ===== ${f.path} =====\n${f.content}`)
    .join("\n\n");

  // ── Prompt — fixed sentence count to prevent Gemini truncation ──────────────
  const prompt = `
You are a senior code reviewer analyzing a student's project submission for an educational platform.

TECH STACK CONTEXT:
${stackContext}

QUESTION REQUIREMENTS:
${questionText}
${failedTcText}

STUDENT'S SUBMITTED CODE:
${codeBlock}

YOUR JOB:
Write exactly 5 sentences reviewing the student's code against the question requirements.
- Mention specific class names, method names, or function names from their actual code.
- Identify what is missing, incorrect, or poorly implemented based on the tech stack above.
- Be direct and educational — this feedback will help the student improve.
- Do NOT praise. Focus only on issues and gaps.
- Write in plain paragraph form — no bullet points, no numbered lists, no headers.
- All 5 sentences must be complete — do not cut off mid-sentence.
- Start the paragraph with: "Student code has issues on"

Return ONLY the paragraph text. No JSON. No markdown. No extra formatting.
`;

  // ── LLM call — max_tokens 800 to prevent Gemini truncation ─────────────────
  const { text, provider, model } = await llmCall({
    task:        "analysis",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens:  2000,   // ✅ bumped from 500 → 800 to fix Gemini truncation
  });

  console.log(`  ✅ Analysis done via [${provider}] model: ${model}`);

  let analysis = text
    .replace(/^```[a-z]*\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();

if (!analysis.toLowerCase().startsWith("student code has issues on")) {
  if (analysis.toLowerCase().startsWith("student code has")) {
    analysis = "Student code has issues on" + analysis.slice("student code has".length);
  } else {
    analysis = "Student code has issues on " + analysis;
  }
}

  return {
    success:       true,
    studentName:   studentName || "Unknown",
    repoKey,
    techStack,
    filesAnalyzed: fileContents.map(f => f.path),
    provider,
    analysis,
  };
}

