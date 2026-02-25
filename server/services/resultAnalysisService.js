// services/resultAnalysisService.js
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GITHUB_ORG   = "iamneo-production-2";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// ── Stack Contexts ─────────────────────────────────────────────────────────────

const STACK_CONTEXT = {
  "puppeteer":  "This is a web project tested with Puppeteer. Focus on HTML structure, CSS styling, and JavaScript DOM interactions.",
  "node-jest":  "This is a Node.js backend project tested with Jest. Focus on module exports, function logic, async handling, and route handlers.",
  "react-jest": "This is a React project tested with React Testing Library + Jest. Focus on component structure, props, state management, and rendering logic.",
  "karma":      "This is an Angular project tested with Karma. Focus on component logic, services, dependency injection, and test spec correctness.",
  "junit":      "This is a Java project tested with JUnit. Focus on class structure, method implementations, exception handling, and Spring annotations.",
  "nunit":      "This is a .NET/C# project tested with NUnit. Focus on model classes, controller actions, DbContext configuration, and dependency injection.",
};

// ── Only real source file extensions per stack ─────────────────────────────────

const STACK_EXTENSIONS = {
  "puppeteer":  ["html", "css", "js"],
  "node-jest":  ["js", "ts"],
  "react-jest": ["jsx", "tsx", "js", "ts"],
  "karma":      ["ts", "js", "html"],
  "junit":      ["java"],
  "nunit":      ["cs"],
};

// ── App root folder name patterns to discover dynamically ──────────────────────

const STACK_ROOT_PATTERNS = {
  "puppeteer":  ["public"],
  "node-jest":  ["nodeapp", "node-app", "node_app", "backend", "server", "app"],
  "react-jest": ["reactapp", "react-app", "react_app", "frontend", "client", "app"],
  "karma":      ["angularapp", "angular-app", "angular_app", "frontend", "client", "app"],
  "junit":      ["javaapp", "java-app", "java_app", "springapp", "spring-app", "backend", "app"],
  "nunit":      ["dotnetapp", "dotnet-app", "dotnet_app", "csharpapp", "backend", "app"],
};

// ── Source subfolders inside app root to try in order ─────────────────────────

const STACK_SOURCE_SUBFOLDERS = {
  "puppeteer":  [""],
  "node-jest":  ["src", ""],
  "react-jest": ["src"],
  "karma":      ["src"],
  "junit":      ["src/main/java", "src"],
  "nunit":      [""],
};

// ── Folders to always skip ─────────────────────────────────────────────────────

const SKIP_FOLDERS = [
  // dependency / build output
  "node_modules", ".git", "build", "dist", "coverage", "out",
  // test folders
  "__tests__", "__mocks__", "test", "tests", "spec", "specs",
  // dotnet / java build output
  "bin", "obj", "target", "Migrations",
  // config / ide folders
  ".config", "Properties", "wwwroot", ".vs", ".idea", ".vscode",
  // test results
  "TestResults",
];

// ── File patterns to skip (regex) ─────────────────────────────────────────────

const SKIP_FILE_PATTERNS = [
  // test files — all stacks
  /\.test\.(js|ts|jsx|tsx)$/i,
  /\.spec\.(js|ts|jsx|tsx)$/i,
  /Test\.java$/i,
  /Tests\.cs$/i,
  /Spec\.ts$/i,

  // react / node setup & config
  /^setupTests\./i,
  /^reportWebVitals\./i,
  /^jest\.config\./i,
  /^babel\.config\./i,
  /^webpack\.config\./i,
  /^craco\.config\./i,
  /^vite\.config\./i,
  /^tailwind\.config\./i,
  /^postcss\.config\./i,

  // angular / karma config
  /^karma\.conf\./i,
  /^protractor\.conf\./i,
  /^angular\.json$/i,
  /^\.browserslistrc$/i,
  /^polyfills\./i,
  /^environments\//i,

  // dotnet non-logic files
  /\.csproj$/i,
  /\.sln$/i,
  /^AssemblyInfo\.cs$/i,
  /^GlobalUsings\.cs$/i,
  /^Startup\.cs$/i,        // remove if you want startup included

  // java non-logic files
  /^module-info\.java$/i,
  /\.pom$/i,

  // eslint / prettier / lint
  /^\.eslint/i,
  /^\.prettier/i,
  /^\.stylelint/i,

  // package / lock files
  /^package(-lock)?\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\./i,
  /^tsconfig/i,

  // docs / misc
  /^README/i,
  /^CHANGELOG/i,
  /^LICENSE/i,
];

// ── Priority keywords — important files float to top ──────────────────────────

const PRIORITY_KEYWORDS = [
  // C# / NUnit
  "controller", "model", "program", "context", "dbcontext",
  "service", "repository", "interface", "exception",
  // Java / JUnit
  "Controller", "Service", "Repository", "Entity", "Application", "Config", "Exception",
  // React
  "App", "index", "api", "routes", "router", "store", "context", "hook", "slice",
  // Node
  "server", "app", "middleware",
  // Angular
  "component", "service", "module", "guard",
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

// ── Dynamic app root discovery ─────────────────────────────────────────────────

async function discoverAppRoot(repoKey, stack) {
  // Puppeteer always uses public/
  if (stack === "puppeteer") return "public";

  const rootItems = await listGitHubFolder(repoKey, "");
  const patterns  = STACK_ROOT_PATTERNS[stack] || [];

  // Try matching root folder names against known patterns
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

// ── Source file collector ──────────────────────────────────────────────────────

async function collectSourceFiles(repoKey, folderPath, allowedExts, depth = 0) {
  if (depth > 3) return [];

  const items = await listGitHubFolder(repoKey, folderPath);
  const files = [];

  for (const item of items) {
    if (item.type === "dir") {
      // Skip noise folders
      if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
      const subFiles = await collectSourceFiles(repoKey, item.path, allowedExts, depth + 1);
      files.push(...subFiles);
      continue;
    }

    if (item.type !== "file") continue;

    const ext  = item.name.split(".").pop()?.toLowerCase();
    const name = item.name;

    // Must match allowed extensions for this stack
    if (!allowedExts.includes(ext)) continue;

    // Skip test / config / noise files
    if (SKIP_FILE_PATTERNS.some(pattern => pattern.test(name))) continue;

    // Skip oversized files
    if (item.size > 80000) continue;

    files.push({ path: item.path, name });
  }

  return files;
}

// ── HTML stripper ──────────────────────────────────────────────────────────────

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
  const allowedExts  = STACK_EXTENSIONS[techStack]       || ["js"];
  const stackContext = STACK_CONTEXT[techStack]           || STACK_CONTEXT["puppeteer"];
  const subFolders   = STACK_SOURCE_SUBFOLDERS[techStack] || ["src"];

  // Step 1: Dynamically find the app root folder
  const appRoot = await discoverAppRoot(repoKey, techStack);

  // Step 2: Try each source subfolder in order until files are found
  let fileList = [];

  for (const sub of subFolders) {
    const scanPath = [appRoot, sub].filter(Boolean).join("/");
    console.log(`  📂 Scanning "${scanPath || "root"}" (stack: ${techStack})...`);

    const found = await collectSourceFiles(repoKey, scanPath, allowedExts);

    if (found.length > 0) {
      fileList = found;
      console.log(`  ✅ Found ${found.length} source file(s) in "${scanPath || "root"}"`);
      break;
    }
  }

  // Step 3: Last resort — scan full repo root
  if (fileList.length === 0) {
    console.warn(`  ⚠️  No source files in expected paths. Scanning full repo root...`);
    fileList = await collectSourceFiles(repoKey, "", allowedExts);
  }

  if (fileList.length === 0) {
    throw new Error(`No ${allowedExts.join("/")} source files found in repository`);
  }

  // Step 4: Sort by priority (controllers, models, program first) — cap at 12
  fileList.sort((a, b) => scoreFile(b.path) - scoreFile(a.path));
  const topFiles = fileList.slice(0, 12);

  console.log(`  📄 Top files: ${topFiles.map(f => f.path).join(", ")}`);

  // Step 5: Fetch file contents
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

  // Step 6: Build prompt
  const questionText = stripHtml(questionHtml);
  const failedTcText = failedTestcases.length > 0
    ? `\nFailed test cases: ${failedTestcases.join(", ")}`
    : "";
  const codeBlock = fileContents
    .map(f => `// ===== ${f.path} =====\n${f.content}`)
    .join("\n\n");

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
Write a detailed analysis paragraph (5 to 6 sentences) reviewing the student's code against the question requirements.
- Mention specific class names, method names, or function names from their actual code.
- Identify what is missing, incorrect, or poorly implemented based on the tech stack above.
- Be direct and educational — this feedback will help the student improve.
- Do NOT praise. Focus only on issues and gaps.
- Write in plain paragraph form — no bullet points, no numbered lists, no headers.
- Start the paragraph with: "Student code has"

Return ONLY the paragraph text. No JSON. No markdown. No extra formatting.
`;

  // Step 7: Groq call with retry
  console.log(`  🤖 Sending to Groq (stack: ${techStack}, files: ${fileContents.length})...`);

  let message;
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      message = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      });
      break;
    } catch (groqErr) {
      const isRetryable =
        groqErr.message?.toLowerCase().includes("connection") ||
        groqErr.message?.toLowerCase().includes("rate")       ||
        groqErr.status === 429 ||
        groqErr.status >= 500;

      if (attempt < MAX_RETRIES && isRetryable) {
        const delay = attempt * 3000;
        console.warn(`  ⚠️  Groq attempt ${attempt} failed (${groqErr.message}), retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw groqErr;
      }
    }
  }

  let analysis = message.choices[0].message.content
    .trim()
    .replace(/^```[a-z]*\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();

  if (!analysis.startsWith("Student code has")) {
    analysis = "Student code has " + analysis;
  }

  return {
    success:       true,
    studentName:   studentName || "Unknown",
    repoKey,
    techStack,
    filesAnalyzed: fileContents.map(f => f.path),
    analysis,
  };
}