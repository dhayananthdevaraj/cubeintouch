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
  "TestResults", ".mvn", "__pycache__", ".pytest_cache", "venv", ".venv", "env",
  "migrations", "static", "media", "htmlcov", "TestProject", "UnitTests", "IntegrationTests"
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
  /^UnitTest\d*\.cs$/i,
  /^Usings\.cs$/i,
  /^WeatherForecast\.cs$/i,
  /WeatherForecast.*\.cs$/i,
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

function estimateTokens(text) {
  return Math.ceil(text.length / 3.5);
}

// ── GitHub helpers ─────────────────────────────────────────────────────────────

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

// ── Stage 1: Code Summary ──────────────────────────────────────────────────────
// Reads the actual code and produces a structured summary:
//   - what classes/functions exist
//   - what each one does (briefly)
//   - what looks wrong, incomplete, or incorrectly implemented
// No question context. No stack assumptions. Pure code reading.

async function observeCode(codeBlock) {
  const prompt = `You are a code reader. Read the code below carefully.

Produce a structured summary with two sections:

STRUCTURE:
List every class, function, or method you see. One line each.
Format: <name> — <what it does in 5 words or less>

ISSUES:
List every problem you can directly see in the code.
Each issue must reference the exact class name or method name where it occurs.
Focus on: wrong logic, incorrect return values, missing implementation, wrong behavior, bad error handling, missing required operations.
Do NOT guess what is missing based on conventions. Only report what you can see is wrong or incomplete in the actual code.
One line per issue. Be specific. Be short.

CODE:
${codeBlock}

Return only the two sections. No extra text. No explanations.`;

  console.log(`  🔍 Stage 1 — Code observation (~${estimateTokens(prompt)} tokens)`);

  const { text, provider, model } = await llmCall({
    task:        "analysis-observe",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens:  600,
  });

  console.log(`  ✅ Stage 1 done via [${provider}/${model}]`);
  console.log(`  📋 Code summary:\n${text}`);

  return text.trim();
}

// ── Stage 2: Final Report ──────────────────────────────────────────────────────
// Takes the code summary + question requirements.
// Matches actual code issues against what the question expects.
// Writes a natural flowing paragraph — no lists, no test case mentions.

async function writeReport(codeSummary, questionText, failedTcText, stackContext) {
  const prompt = `You are a senior code reviewer writing feedback for a student submission on an educational platform.

TECH STACK CONTEXT:
${stackContext}

QUESTION REQUIREMENTS:
${questionText}
${failedTcText ? `\nFailed checks: ${failedTcText}` : ""}

CODE SUMMARY (what the student actually wrote):
${codeSummary}

YOUR JOB:
Write a feedback paragraph of 3 to 5 sentences.

Rules:
- Cross-reference the code summary against the question requirements.
- Mention specific class names and method names from the code summary.
- Describe what the code actually does wrong or what is missing, compared to what the question requires.
- Be direct and educational. This helps the student understand where their implementation failed.
- Do NOT use the words: testcase, test case, test-case, TC, unit test, spec.
- Do NOT praise anything.
- Do NOT use bullet points, numbered lists, or headers.
- Write as one continuous paragraph only.
- Every sentence must be complete — do not cut off.
- Start the paragraph with exactly: "Student code has issues on"

Return ONLY the paragraph. No JSON. No markdown. No extra text.`;

  console.log(`  ✍️  Stage 2 — Report writing (~${estimateTokens(prompt)} tokens)`);

  const { text, provider, model } = await llmCall({
    task:        "analysis",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens:  600,
  });

  console.log(`  ✅ Stage 2 done via [${provider}/${model}]`);
  return { text: text.trim(), provider, model };
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

  // ── Discover repo structure ───────────────────────────────────────────────────
  const appRoot = await discoverAppRoot(repoKey, techStack);

  let scanPath;
  if (techStack === "junit") {
    scanPath = await findJavaSourceRoot(repoKey, appRoot);
    console.log(`  📂 Java source root resolved to: "${scanPath}"`);
  } else if (techStack === "nunit" || techStack === "pytest") {
    scanPath = appRoot;
  } else {
    const tryWithSrc = [appRoot, "src"].filter(Boolean).join("/");
    const srcItems   = await listGitHubFolder(repoKey, tryWithSrc);
    scanPath = srcItems.length > 0 ? tryWithSrc : appRoot;
  }

  // ── Collect and score files ───────────────────────────────────────────────────
  let fileList = await collectSourceFiles(repoKey, scanPath, allowedExts);
  if (fileList.length === 0) {
    console.warn(`  ⚠️  No files in "${scanPath}". Scanning full repo root...`);
    fileList = await collectSourceFiles(repoKey, "", allowedExts);
  }
  if (fileList.length === 0) {
    throw new Error(`No ${allowedExts.join("/")} source files found in repository`);
  }

  fileList.sort((a, b) => scoreFile(b.path) - scoreFile(a.path));

  // ── Read files — token-aware budget ──────────────────────────────────────────
  // Stage 1 target: keep codeBlock under ~3500 tokens (~12000 chars total)
  const CODE_CHAR_BUDGET = 12_000;
  const topFiles         = fileList.slice(0, 10);

  console.log(`  📄 Candidate files: ${topFiles.map(f => f.path).join(", ")}`);

  const fileContents = [];
  let   charsSoFar   = 0;

  for (const file of topFiles) {
    if (charsSoFar >= CODE_CHAR_BUDGET) break;
    const content = await fetchGitHubFile(repoKey, file.path);
    if (!content) continue;
    const remaining = CODE_CHAR_BUDGET - charsSoFar;
    const sliced    = content.slice(0, Math.min(4000, remaining));
    fileContents.push({ path: file.path, content: sliced });
    charsSoFar += sliced.length;
  }

  if (fileContents.length === 0) {
    throw new Error("Could not read any source files from repository");
  }

  console.log(`  📦 Files loaded: ${fileContents.length} — total chars: ${charsSoFar}`);

  const codeBlock = fileContents
    .map(f => `// ===== ${f.path} =====\n${f.content}`)
    .join("\n\n");

  const questionText = stripHtml(questionHtml);
  const failedTcText = failedTestcases.length > 0
    ? failedTestcases.join(", ")
    : "";

  // ── Stage 1: Read and summarise the code ─────────────────────────────────────
  const codeSummary = await observeCode(codeBlock);

  // ── Stage 2: Write final report ───────────────────────────────────────────────
  const { text, provider, model } = await writeReport(
    codeSummary,
    questionText,
    failedTcText,
    stackContext
  );

  // ── Normalise output prefix ───────────────────────────────────────────────────
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

  // ── Strip any "test case" mentions that slipped through ──────────────────────
  analysis = analysis
    .replace(/\btest[\s-]?cases?\b/gi, "checks")
    .replace(/\bunit[\s-]?tests?\b/gi, "validations")
    .replace(/\b(TC|spec)\b/g, "check");

  console.log(`  ✅ Analysis complete via [${provider}/${model}]`);

  return {
    success:       true,
    studentName:   studentName || "Unknown",
    repoKey,
    techStack,
    filesAnalyzed: fileContents.map(f => f.path),
    codeSummary,                      // stored for debugging
    provider,
    analysis,
  };
}