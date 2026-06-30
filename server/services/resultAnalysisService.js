// // services/resultAnalysisService.js
// import { llmCall } from "./llmQueue.js";
// import dotenv from "dotenv";

// dotenv.config();

// const GITHUB_ORG   = "iamneo-production-2";
// const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// // ── Stack Contexts ─────────────────────────────────────────────────────────────

// const STACK_CONTEXT = {
//   "puppeteer":  "This is a web project tested with Puppeteer. Focus on HTML structure, CSS styling, and JavaScript DOM interactions.",
//   "node-jest":  "This is a Node.js backend project tested with Jest. Focus on module exports, function logic, async handling, and route handlers.",
//   "react-jest": "This is a React project tested with React Testing Library + Jest. Focus on component structure, props, state management, and rendering logic.",
//   "karma":      "This is an Angular project tested with Karma. Focus on component logic, services, dependency injection, and test spec correctness.",
//   "junit":      "This is a Java Spring Boot project tested with JUnit. Focus on class structure, method implementations, exception handling, and Spring annotations.",
//   "nunit":      "This is a .NET/C# project tested with NUnit. Focus on model classes, controller actions, DbContext configuration, and dependency injection.",
//   "pytest":     "This is a Python project tested with Pytest. Focus on function logic, class methods, module structure, return values, exception handling, and correct use of Python conventions.",
// };

// const STACK_EXTENSIONS = {
//   "puppeteer":  ["html", "css", "js"],
//   "node-jest":  ["js", "ts"],
//   "react-jest": ["jsx", "tsx", "js", "ts"],
//   "karma":      ["ts", "js", "html"],
//   "junit":      ["java"],
//   "nunit":      ["cs"],
//   "pytest":     ["py"],
// };

// const SKIP_FOLDERS = [
//   "node_modules", ".git", "build", "dist", "coverage", "out",
//   "__tests__", "__mocks__", "test", "tests", "spec", "specs",
//   "bin", "obj", "target", "Migrations",
//   ".config", "Properties", "wwwroot", ".vs", ".idea", ".vscode",
//   "TestResults", ".mvn", "__pycache__", ".pytest_cache", "venv", ".venv", "env",
//   "migrations", "static", "media", "htmlcov", "TestProject", "UnitTests", "IntegrationTests"
// ];

// const SKIP_FILE_PATTERNS = [
//   /\.test\.(js|ts|jsx|tsx)$/i,
//   /\.spec\.(js|ts|jsx|tsx)$/i,
//   /Test\.java$/i,
//   /Tests\.cs$/i,
//   /Spec\.ts$/i,
//   /^setupTests\./i,
//   /^reportWebVitals\./i,
//   /^jest\.config\./i,
//   /^babel\.config\./i,
//   /^webpack\.config\./i,
//   /^craco\.config\./i,
//   /^vite\.config\./i,
//   /^tailwind\.config\./i,
//   /^postcss\.config\./i,
//   /^karma\.conf\./i,
//   /^protractor\.conf\./i,
//   /^angular\.json$/i,
//   /^\.browserslistrc$/i,
//   /^polyfills\./i,
//   /\.csproj$/i,
//   /\.sln$/i,
//   /^AssemblyInfo\.cs$/i,
//   /^GlobalUsings\.cs$/i,
//   /^module-info\.java$/i,
//   /\.pom$/i,
//   /^\.eslint/i,
//   /^\.prettier/i,
//   /^\.stylelint/i,
//   /^package(-lock)?\.json$/i,
//   /^yarn\.lock$/i,
//   /^pnpm-lock\./i,
//   /^tsconfig/i,
//   /^README/i,
//   /^CHANGELOG/i,
//   /^LICENSE/i,
//   /^test_.*\.py$/i,
//   /.*_test\.py$/i,
//   /^conftest\.py$/i,
//   /^setup\.py$/i,
//   /^setup\.cfg$/i,
//   /^pyproject\.toml$/i,
//   /^requirements.*\.txt$/i,
//   /^__init__\.py$/i,
//   /^UnitTest\d*\.cs$/i,
//   /^Usings\.cs$/i,
//   /^WeatherForecast\.cs$/i,
//   /WeatherForecast.*\.cs$/i,
// ];

// const PRIORITY_KEYWORDS = [
//   "controller", "model", "program", "context", "dbcontext",
//   "service", "repository", "interface", "exception",
//   "Controller", "Service", "Repository", "Entity", "Application", "Config", "Exception",
//   "App", "index", "api", "routes", "router", "store", "context", "hook", "slice",
//   "server", "app", "middleware",
//   "component", "module", "guard",
//   "main", "app", "routes", "views", "models", "schemas",
//   "utils", "helpers", "database", "db", "config", "settings",
//   "manager", "handler", "client", "server",
// ];

// function scoreFile(filePath) {
//   const lower = filePath.toLowerCase();
//   for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
//     if (lower.includes(PRIORITY_KEYWORDS[i].toLowerCase())) return 1000 - i;
//   }
//   return 0;
// }

// function estimateTokens(text) {
//   return Math.ceil(text.length / 3.5);
// }

// // ── GitHub helpers ─────────────────────────────────────────────────────────────

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

// async function findJavaSourceRoot(repoKey, appRoot) {
//   const srcMainJava = [appRoot, "src/main/java"].filter(Boolean).join("/");

//   async function walkToJava(path, depth) {
//     if (depth > 6) return path;
//     const items = await listGitHubFolder(repoKey, path);
//     if (!items.length) return path;
//     if (items.some(i => i.type === "file" && i.name.endsWith(".java"))) return path;
//     const dirs = items.filter(i =>
//       i.type === "dir" &&
//       !SKIP_FOLDERS.some(s => i.name.toLowerCase() === s.toLowerCase())
//     );
//     if (dirs.length === 0) return path;
//     if (dirs.length === 1) return walkToJava(dirs[0].path, depth + 1);
//     return path;
//   }

//   console.log(`  🔍 Walking Java source path from: ${srcMainJava}`);
//   return walkToJava(srcMainJava, 0);
// }

// async function discoverAppRoot(repoKey, stack) {
//   if (stack === "puppeteer") return "public";

//   const rootItems = await listGitHubFolder(repoKey, "");

//   if (stack === "junit" || stack === "nunit") {
//     for (const item of rootItems) {
//       if (item.type !== "dir") continue;
//       if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
//       const subItems = await listGitHubFolder(repoKey, item.name);
//       const hasSrc   = subItems.some(s => s.type === "dir" && s.name === "src");
//       if (hasSrc) {
//         console.log(`  🎯 Discovered app root: ${item.name}/`);
//         return item.name;
//       }
//     }
//     const rootHasSrc = rootItems.some(s => s.type === "dir" && s.name === "src");
//     if (rootHasSrc) { console.log(`  🎯 App root is repo root`); return ""; }
//   }

//   if (stack === "pytest") {
//     for (const item of rootItems) {
//       if (item.type !== "dir") continue;
//       if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
//       const subItems = await listGitHubFolder(repoKey, item.name);
//       const hasPy    = subItems.some(s => s.type === "file" && s.name.endsWith(".py"));
//       if (hasPy) {
//         console.log(`  🎯 Discovered Python app root: ${item.name}/`);
//         return item.name;
//       }
//     }
//     const rootHasPy = rootItems.some(s => s.type === "file" && s.name.endsWith(".py"));
//     if (rootHasPy) { console.log(`  🎯 Python app root is repo root`); return ""; }
//   }

//   const STACK_ROOT_PATTERNS = {
//     "node-jest":  ["nodeapp", "node-app", "node_app", "backend", "server", "app"],
//     "react-jest": ["reactapp", "react-app", "react_app", "frontend", "client", "app"],
//     "karma":      ["angularapp", "angular-app", "angular_app", "frontend", "client", "app"],
//   };

//   const patterns = STACK_ROOT_PATTERNS[stack] || [];
//   for (const item of rootItems) {
//     if (item.type !== "dir") continue;
//     const lower = item.name.toLowerCase();
//     if (patterns.some(p => lower === p || lower.startsWith(p))) {
//       console.log(`  🎯 Discovered app root: ${item.name}/`);
//       return item.name;
//     }
//   }

//   console.warn(`  ⚠️  Could not match a known app root. Falling back to repo root.`);
//   return "";
// }

// async function collectSourceFiles(repoKey, folderPath, allowedExts, depth = 0) {
//   if (depth > 4) return [];
//   const items = await listGitHubFolder(repoKey, folderPath);
//   const files = [];

//   for (const item of items) {
//     if (item.type === "dir") {
//       if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
//       const subFiles = await collectSourceFiles(repoKey, item.path, allowedExts, depth + 1);
//       files.push(...subFiles);
//       continue;
//     }
//     if (item.type !== "file") continue;
//     const ext  = item.name.split(".").pop()?.toLowerCase();
//     const name = item.name;
//     if (!allowedExts.includes(ext)) continue;
//     if (SKIP_FILE_PATTERNS.some(p => p.test(name))) continue;
//     if (item.size > 80000) continue;
//     files.push({ path: item.path, name });
//   }

//   return files;
// }

// function stripHtml(html) {
//   if (!html) return "";
//   return html
//     .replace(/<[^>]*>/g, " ")
//     .replace(/&nbsp;/g, " ")
//     .replace(/&lt;/g, "<")
//     .replace(/&gt;/g, ">")
//     .replace(/&amp;/g, "&")
//     .replace(/\s+/g, " ")
//     .trim()
//     .slice(0, 3000);
// }

// // ── Stage 1: Code Summary ──────────────────────────────────────────────────────
// // Reads the actual code and produces a structured summary:
// //   - what classes/functions exist
// //   - what each one does (briefly)
// //   - what looks wrong, incomplete, or incorrectly implemented
// // No question context. No stack assumptions. Pure code reading.

// async function observeCode(codeBlock) {
//   const prompt = `You are a code reader. Read the code below carefully.

// Produce a structured summary with two sections:

// STRUCTURE:
// List every class, function, or method you see. One line each.
// Format: <name> — <what it does in 5 words or less>

// ISSUES:
// List every problem you can directly see in the code.
// Each issue must reference the exact class name or method name where it occurs.
// Focus on: wrong logic, incorrect return values, missing implementation, wrong behavior, bad error handling, missing required operations.
// Do NOT guess what is missing based on conventions. Only report what you can see is wrong or incomplete in the actual code.
// One line per issue. Be specific. Be short.

// CODE:
// ${codeBlock}

// Return only the two sections. No extra text. No explanations.`;

//   console.log(`  🔍 Stage 1 — Code observation (~${estimateTokens(prompt)} tokens)`);

//   const { text, provider, model } = await llmCall({
//     task:        "analysis-observe",
//     messages:    [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens:  1200,
//   });

//   console.log(`  ✅ Stage 1 done via [${provider}/${model}]`);
//   console.log(`  📋 Code summary:\n${text}`);

//   return text.trim();
// }

// // ── Stage 2: Final Report ──────────────────────────────────────────────────────
// // Takes the code summary + question requirements.
// // Matches actual code issues against what the question expects.
// // Writes a natural flowing paragraph — no lists, no test case mentions.

// async function writeReport(codeSummary, questionText, failedTcText, stackContext) {
//   const prompt = `You are a senior code reviewer writing feedback for a student submission on an educational platform.

// TECH STACK CONTEXT:
// ${stackContext}

// QUESTION REQUIREMENTS:
// ${questionText}
// ${failedTcText ? `\nFailed checks: ${failedTcText}` : ""}

// CODE SUMMARY (what the student actually wrote):
// ${codeSummary}

// YOUR JOB:
// Write a feedback paragraph of 3 to 5 sentences.

// Rules:
// - Cross-reference the code summary against the question requirements.
// - Mention specific class names and method names from the code summary.
// - Describe what the code actually does wrong or what is missing, compared to what the question requires.
// - Be direct and educational. This helps the student understand where their implementation failed.
// - Do NOT use the words: testcase, test case, test-case, TC, unit test, spec.
// - Do NOT praise anything.
// - Do NOT use bullet points, numbered lists, or headers.
// - Write as one continuous paragraph only.
// - Every sentence must be complete — do not cut off.
// - Start the paragraph with exactly: "Student code has issues on"

// Return ONLY the paragraph. No JSON. No markdown. No extra text.`;

//   console.log(`  ✍️  Stage 2 — Report writing (~${estimateTokens(prompt)} tokens)`);

//   const { text, provider, model } = await llmCall({
//     task:        "analysis",
//     messages:    [{ role: "user", content: prompt }],
//     temperature: 0.3,
//     max_tokens:  600,
//   });

//   console.log(`  ✅ Stage 2 done via [${provider}/${model}]`);
//   return { text: text.trim(), provider, model };
// }

// // ── Main export ────────────────────────────────────────────────────────────────

// export async function analyzeStudentResult({
//   repoKey,
//   questionHtml,
//   studentName,
//   failedTestcases,
//   techStack = "puppeteer",
// }) {
//   const allowedExts  = STACK_EXTENSIONS[techStack] || ["js"];
//   const stackContext = STACK_CONTEXT[techStack]     || STACK_CONTEXT["puppeteer"];

//   // ── Discover repo structure ───────────────────────────────────────────────────
//   const appRoot = await discoverAppRoot(repoKey, techStack);

//   let scanPath;
//   if (techStack === "junit") {
//     scanPath = await findJavaSourceRoot(repoKey, appRoot);
//     console.log(`  📂 Java source root resolved to: "${scanPath}"`);
//   } else if (techStack === "nunit" || techStack === "pytest") {
//     scanPath = appRoot;
//   } else {
//     const tryWithSrc = [appRoot, "src"].filter(Boolean).join("/");
//     const srcItems   = await listGitHubFolder(repoKey, tryWithSrc);
//     scanPath = srcItems.length > 0 ? tryWithSrc : appRoot;
//   }

//   // ── Collect and score files ───────────────────────────────────────────────────
//   let fileList = await collectSourceFiles(repoKey, scanPath, allowedExts);
//   if (fileList.length === 0) {
//     console.warn(`  ⚠️  No files in "${scanPath}". Scanning full repo root...`);
//     fileList = await collectSourceFiles(repoKey, "", allowedExts);
//   }
//   if (fileList.length === 0) {
//     throw new Error(`No ${allowedExts.join("/")} source files found in repository`);
//   }

//   fileList.sort((a, b) => scoreFile(b.path) - scoreFile(a.path));

//   // ── Read files — token-aware budget ──────────────────────────────────────────
//   // Stage 1 target: keep codeBlock under ~3500 tokens (~12000 chars total)
//   const CODE_CHAR_BUDGET = 12_000;
//   const topFiles         = fileList.slice(0, 10);

//   console.log(`  📄 Candidate files: ${topFiles.map(f => f.path).join(", ")}`);

//   const fileContents = [];
//   let   charsSoFar   = 0;

//   for (const file of topFiles) {
//     if (charsSoFar >= CODE_CHAR_BUDGET) break;
//     const content = await fetchGitHubFile(repoKey, file.path);
//     if (!content) continue;
//     const remaining = CODE_CHAR_BUDGET - charsSoFar;
//     const sliced    = content.slice(0, Math.min(4000, remaining));
//     fileContents.push({ path: file.path, content: sliced });
//     charsSoFar += sliced.length;
//   }

//   if (fileContents.length === 0) {
//     throw new Error("Could not read any source files from repository");
//   }

//   console.log(`  📦 Files loaded: ${fileContents.length} — total chars: ${charsSoFar}`);

//   const codeBlock = fileContents
//     .map(f => `// ===== ${f.path} =====\n${f.content}`)
//     .join("\n\n");

//   const questionText = stripHtml(questionHtml);
//   const failedTcText = failedTestcases.length > 0
//     ? failedTestcases.join(", ")
//     : "";

//   // ── Stage 1: Read and summarise the code ─────────────────────────────────────
//   const codeSummary = await observeCode(codeBlock);

//   // ── Stage 2: Write final report ───────────────────────────────────────────────
//   const { text, provider, model } = await writeReport(
//     codeSummary,
//     questionText,
//     failedTcText,
//     stackContext
//   );

//   // ── Normalise output prefix ───────────────────────────────────────────────────
//   let analysis = text
//     .replace(/^```[a-z]*\s*/gi, "")
//     .replace(/```\s*$/gi, "")
//     .trim();

//   if (!analysis.toLowerCase().startsWith("student code has issues on")) {
//     if (analysis.toLowerCase().startsWith("student code has")) {
//       analysis = "Student code has issues on" + analysis.slice("student code has".length);
//     } else {
//       analysis = "Student code has issues on " + analysis;
//     }
//   }

//   // ── Strip any "test case" mentions that slipped through ──────────────────────
//   analysis = analysis
//     .replace(/\btest[\s-]?cases?\b/gi, "checks")
//     .replace(/\bunit[\s-]?tests?\b/gi, "validations")
//     .replace(/\b(TC|spec)\b/g, "check");

//   console.log(`  ✅ Analysis complete via [${provider}/${model}]`);

//   return {
//     success:       true,
//     studentName:   studentName || "Unknown",
//     repoKey,
//     techStack,
//     filesAnalyzed: fileContents.map(f => f.path),
//     codeSummary,                      // stored for debugging
//     provider,
//     analysis,
//   };
// }
// services/resultAnalysisService.js

//version final
// import { llmCall } from "./llmQueue.js";
// import dotenv from "dotenv";

// dotenv.config();

// const GITHUB_ORG   = "iamneo-production-2";
// const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// // ── Stack Contexts ─────────────────────────────────────────────────────────────

// const STACK_CONTEXT = {
//   "puppeteer":  "This is a web project tested with Puppeteer. Focus on HTML structure, CSS styling, and JavaScript DOM interactions.",
//   "node-jest":  "This is a Node.js backend project tested with Jest. Focus on module exports, function logic, async handling, and route handlers.",
//   "react-jest": "This is a React project tested with React Testing Library + Jest. Focus on component structure, props, state management, and rendering logic.",
//   "karma":      "This is an Angular project tested with Karma. Focus on component logic, services, dependency injection, and test spec correctness.",
//   "junit":      "This is a Java Spring Boot project tested with JUnit. Focus on class structure, method implementations, exception handling, and Spring annotations.",
//   "nunit":      "This is a .NET/C# project tested with NUnit. Focus on model classes, controller actions, DbContext configuration, and dependency injection.",
//   "pytest":     "This is a Python project tested with Pytest. Focus on function logic, class methods, module structure, return values, exception handling, and correct use of Python conventions.",
// };

// const STACK_EXTENSIONS = {
//   "puppeteer":  ["html", "css", "js"],
//   "node-jest":  ["js", "ts"],
//   "react-jest": ["jsx", "tsx", "js", "ts"],
//   "karma":      ["ts", "js", "html"],
//   "junit":      ["java"],
//   "nunit":      ["cs"],
//   "pytest":     ["py"],
// };

// const SKIP_FOLDERS = [
//   "node_modules", ".git", "build", "dist", "coverage", "out",
//   "__tests__", "__mocks__", "test", "tests", "spec", "specs",
//   "bin", "obj", "target", "Migrations",
//   ".config", "Properties", "wwwroot", ".vs", ".idea", ".vscode",
//   "TestResults", ".mvn", "__pycache__", ".pytest_cache", "venv", ".venv", "env",
//   "migrations", "static", "media", "htmlcov", "TestProject", "UnitTests", "IntegrationTests"
// ];

// const SKIP_FILE_PATTERNS = [
//   /\.test\.(js|ts|jsx|tsx)$/i,
//   /\.spec\.(js|ts|jsx|tsx)$/i,
//   /Test\.java$/i,
//   /Tests\.cs$/i,
//   /Spec\.ts$/i,
//   /^setupTests\./i,
//   /^reportWebVitals\./i,
//   /^jest\.config\./i,
//   /^babel\.config\./i,
//   /^webpack\.config\./i,
//   /^craco\.config\./i,
//   /^vite\.config\./i,
//   /^tailwind\.config\./i,
//   /^postcss\.config\./i,
//   /^karma\.conf\./i,
//   /^protractor\.conf\./i,
//   /^angular\.json$/i,
//   /^\.browserslistrc$/i,
//   /^polyfills\./i,
//   /\.csproj$/i,
//   /\.sln$/i,
//   /^AssemblyInfo\.cs$/i,
//   /^GlobalUsings\.cs$/i,
//   /^module-info\.java$/i,
//   /\.pom$/i,
//   /^\.eslint/i,
//   /^\.prettier/i,
//   /^\.stylelint/i,
//   /^package(-lock)?\.json$/i,
//   /^yarn\.lock$/i,
//   /^pnpm-lock\./i,
//   /^tsconfig/i,
//   /^README/i,
//   /^CHANGELOG/i,
//   /^LICENSE/i,
//   /^test_.*\.py$/i,
//   /.*_test\.py$/i,
//   /^conftest\.py$/i,
//   /^setup\.py$/i,
//   /^setup\.cfg$/i,
//   /^pyproject\.toml$/i,
//   /^requirements.*\.txt$/i,
//   /^__init__\.py$/i,
//   /^UnitTest\d*\.cs$/i,
//   /^Usings\.cs$/i,
//   /^WeatherForecast\.cs$/i,
//   /WeatherForecast.*\.cs$/i,
// ];

// const PRIORITY_KEYWORDS = [
//   "controller", "model", "program", "context", "dbcontext",
//   "service", "repository", "interface", "exception",
//   "Controller", "Service", "Repository", "Entity", "Application", "Config", "Exception",
//   "App", "index", "api", "routes", "router", "store", "context", "hook", "slice",
//   "server", "app", "middleware",
//   "component", "module", "guard",
//   "main", "app", "routes", "views", "models", "schemas",
//   "utils", "helpers", "database", "db", "config", "settings",
//   "manager", "handler", "client", "server",
// ];

// function scoreFile(filePath) {
//   const lower = filePath.toLowerCase();
//   for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
//     if (lower.includes(PRIORITY_KEYWORDS[i].toLowerCase())) return 1000 - i;
//   }
//   return 0;
// }

// function estimateTokens(text) {
//   return Math.ceil(text.length / 3.5);
// }

// // ── GitHub helpers ─────────────────────────────────────────────────────────────

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

// async function findJavaSourceRoot(repoKey, appRoot) {
//   const srcMainJava = [appRoot, "src/main/java"].filter(Boolean).join("/");

//   async function walkToJava(path, depth) {
//     if (depth > 6) return path;
//     const items = await listGitHubFolder(repoKey, path);
//     if (!items.length) return path;
//     if (items.some(i => i.type === "file" && i.name.endsWith(".java"))) return path;
//     const dirs = items.filter(i =>
//       i.type === "dir" &&
//       !SKIP_FOLDERS.some(s => i.name.toLowerCase() === s.toLowerCase())
//     );
//     if (dirs.length === 0) return path;
//     if (dirs.length === 1) return walkToJava(dirs[0].path, depth + 1);
//     return path;
//   }

//   console.log(`  🔍 Walking Java source path from: ${srcMainJava}`);
//   return walkToJava(srcMainJava, 0);
// }

// async function discoverAppRoot(repoKey, stack) {
//   if (stack === "puppeteer") return "public";

//   const rootItems = await listGitHubFolder(repoKey, "");

//   if (stack === "junit" || stack === "nunit") {
//     for (const item of rootItems) {
//       if (item.type !== "dir") continue;
//       if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
//       const subItems = await listGitHubFolder(repoKey, item.name);
//       const hasSrc   = subItems.some(s => s.type === "dir" && s.name === "src");
//       if (hasSrc) {
//         console.log(`  🎯 Discovered app root: ${item.name}/`);
//         return item.name;
//       }
//     }
//     const rootHasSrc = rootItems.some(s => s.type === "dir" && s.name === "src");
//     if (rootHasSrc) { console.log(`  🎯 App root is repo root`); return ""; }
//   }

//   if (stack === "pytest") {
//     for (const item of rootItems) {
//       if (item.type !== "dir") continue;
//       if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
//       const subItems = await listGitHubFolder(repoKey, item.name);
//       const hasPy    = subItems.some(s => s.type === "file" && s.name.endsWith(".py"));
//       if (hasPy) {
//         console.log(`  🎯 Discovered Python app root: ${item.name}/`);
//         return item.name;
//       }
//     }
//     const rootHasPy = rootItems.some(s => s.type === "file" && s.name.endsWith(".py"));
//     if (rootHasPy) { console.log(`  🎯 Python app root is repo root`); return ""; }
//   }

//   const STACK_ROOT_PATTERNS = {
//     "node-jest":  ["nodeapp", "node-app", "node_app", "backend", "server", "app"],
//     "react-jest": ["reactapp", "react-app", "react_app", "frontend", "client", "app"],
//     "karma":      ["angularapp", "angular-app", "angular_app", "frontend", "client", "app"],
//   };

//   const patterns = STACK_ROOT_PATTERNS[stack] || [];
//   for (const item of rootItems) {
//     if (item.type !== "dir") continue;
//     const lower = item.name.toLowerCase();
//     if (patterns.some(p => lower === p || lower.startsWith(p))) {
//       console.log(`  🎯 Discovered app root: ${item.name}/`);
//       return item.name;
//     }
//   }

//   console.warn(`  ⚠️  Could not match a known app root. Falling back to repo root.`);
//   return "";
// }

// async function collectSourceFiles(repoKey, folderPath, allowedExts, depth = 0) {
//   if (depth > 4) return [];
//   const items = await listGitHubFolder(repoKey, folderPath);
//   const files = [];

//   for (const item of items) {
//     if (item.type === "dir") {
//       if (SKIP_FOLDERS.some(s => item.name.toLowerCase() === s.toLowerCase())) continue;
//       const subFiles = await collectSourceFiles(repoKey, item.path, allowedExts, depth + 1);
//       files.push(...subFiles);
//       continue;
//     }
//     if (item.type !== "file") continue;
//     const ext  = item.name.split(".").pop()?.toLowerCase();
//     const name = item.name;
//     if (!allowedExts.includes(ext)) continue;
//     if (SKIP_FILE_PATTERNS.some(p => p.test(name))) continue;
//     if (item.size > 80000) continue;
//     files.push({ path: item.path, name });
//   }

//   return files;
// }

// function stripHtml(html) {
//   if (!html) return "";
//   return html
//     .replace(/<[^>]*>/g, " ")
//     .replace(/&nbsp;/g, " ")
//     .replace(/&lt;/g, "<")
//     .replace(/&gt;/g, ">")
//     .replace(/&amp;/g, "&")
//     .replace(/\s+/g, " ")
//     .trim()
//     .slice(0, 3000);
// }

// // ── Stage 1: Code Summary ──────────────────────────────────────────────────────
// // Reads the actual code and produces a structured summary:
// //   - what classes/functions exist
// //   - what's correctly implemented
// //   - what looks wrong, incomplete, or incorrectly implemented (with literal code quotes)
// // No question context. No stack assumptions. Pure code reading.

// async function observeCode(codeBlock) {
//   const prompt = `You are a code reader. Read the code below carefully and thoroughly.

// Produce a structured summary with three sections:

// STRUCTURE:
// List every class, function, or method you see. One line each.
// Format: <name> — <what it does, 8-15 words, describing actual logic not just a label>

// WORKING CORRECTLY:
// List what is properly implemented and functions as expected — correct logic, proper return types, correct status codes, proper validation, correct relationships, correct use of attributes/annotations, etc.
// Be specific: name the class/method and explain what it does right.
// If nothing stands out as notably correct, write "Standard implementation, no notable correct highlights."

// ISSUES:
// List every problem you can directly see in the code.
// Each issue MUST follow this exact format:
// <ClassName.MethodName> — CODE: "<paste the exact relevant line(s) from the code, max 1-2 lines, verbatim, no paraphrasing>" — PROBLEM: <why this is wrong, referencing only what the quoted code actually does>
// Do NOT describe an issue without quoting the literal code line that causes it. If you cannot quote the exact line that causes the problem, do not report the issue at all.
// Focus only on what is directly observable in the code: wrong logic, incorrect return values, wrong status codes, missing implementation, wrong behavior, bad error handling, missing required operations.
// Do NOT guess what is missing based on general conventions, best practices, or "what a real-world app should have." Only report what you can concretely see is wrong or incomplete in the actual code in front of you.
// Do NOT invent validation rules, business logic checks, or features that aren't present in the code — you are describing what exists and what's broken in what exists, not suggesting new features.
// CRITICAL DISTINCTION — read carefully before writing each issue:
// - If a check, validation, or piece of logic is completely ABSENT from the code (no relevant line exists at all), describe it as "missing" — e.g. "no null check exists before X".
// - If a check, validation, or piece of logic IS present in the code but is logically wrong, backwards, or broken (wrong method call, wrong comparison, wrong condition, references the wrong variable, etc.), you MUST describe it as "incorrectly implemented" and explain exactly what it does versus what it should do. NEVER describe existing-but-broken logic as "missing", "does not have", or "does not validate" — that is a false claim. Quote the broken line and explain the actual behavior it produces.
// One line per issue, but explain it fully — do not over-compress into a fragment.

// CODE:
// ${codeBlock}

// Return only the three sections. No extra text. No explanations outside the sections. Do not skip the WORKING CORRECTLY section even if short.`;

//   const reqEstimate = estimateTokens(prompt);
//   console.log(`  🔍 Stage 1 — Code observation (request est: ~${reqEstimate} tokens)`);

//   const { text, provider, model, usage } = await llmCall({
//     task:        "analysis-observe",
//     messages:    [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens:  1800,
//   });

//   console.log(
//     `  ✅ Stage 1 done via [${provider}/${model}] — ` +
//     `tokens → prompt: ${usage?.promptTokens ?? "n/a"}, completion: ${usage?.completionTokens ?? "n/a"}, total: ${usage?.totalTokens ?? "n/a"}`
//   );
//   console.log(`  📋 Code summary:\n${text}`);

//   return {
//     summary: text.trim(),
//     usage: {
//       promptTokens:     usage?.promptTokens     ?? null,
//       completionTokens: usage?.completionTokens ?? null,
//       totalTokens:      usage?.totalTokens      ?? null,
//     },
//   };
// }

// // ── Stage 2: Final Report ──────────────────────────────────────────────────────
// // Takes the code summary + question requirements.
// // Matches actual code issues against what the question expects.
// // Filters out irrelevant generic observations AND forbids inventing requirements
// // that aren't explicitly in the question text.
// // Writes a natural flowing paragraph — no lists, no test case mentions.

// async function writeReport(codeSummary, questionText, failedTcText, stackContext) {
//   const prompt = `You are a senior code reviewer writing honest, accurate feedback for a student submission that failed evaluation.

// TECH STACK CONTEXT:
// ${stackContext}

// QUESTION REQUIREMENTS:
// ${questionText}
// ${failedTcText ? `\nFailed checks: ${failedTcText}` : ""}

// CODE SUMMARY (structure, what works, and what's wrong, with literal code quotes — may include general observations not relevant to this question):
// ${codeSummary}

// YOUR JOB:
// Write an honest feedback paragraph of 3 to 6 sentences explaining why this submission failed, relative to what THIS QUESTION asks for.

// HARD RULES — READ CAREFULLY:
// 1. You may ONLY report issues that are explicitly present in the ISSUES section of the CODE SUMMARY above, AND that map to something explicitly stated in QUESTION REQUIREMENTS. If an issue from the CODE SUMMARY is real but not mentioned anywhere in QUESTION REQUIREMENTS, DISCARD it completely — do not mention it even briefly.
// 2. Do NOT invent validation rules, business logic checks, uniqueness checks, association checks, or "best practice" concerns that are not explicitly written in QUESTION REQUIREMENTS — even if they would be reasonable in a real-world API. Never include things like duplicate-name checks, checking for existing associations before create, generic extra input validation, or checking for related records before delete unless QUESTION REQUIREMENTS explicitly asks for them.
// 3. Before claiming a delete/cascade-related issue, check the OnDelete/cascade behavior stated in QUESTION REQUIREMENTS first — do not suggest a pre-delete check that would contradict an explicit cascade-delete requirement.
// 4. For every issue you mention, you must be able to point to the specific line or sentence in QUESTION REQUIREMENTS it violates (a stated status code, a stated return type, a stated field behavior, a stated relationship). If you cannot point to that exact line, do not mention the issue — do not pad the paragraph with vague claims like "incorrect handling" without naming the precise expected behavior from the requirements.
// 5. Preserve the CODE SUMMARY's distinction between "missing" and "incorrectly implemented" exactly as written. If the CODE SUMMARY says something is incorrectly implemented (exists but is broken), you MUST describe it the same way in your paragraph — never rephrase an "incorrectly implemented" issue as if it were "missing" or "not handled". Misrepresenting a broken-but-present check as absent is a factual error.
// 6. If, after applying rules 1-5, there are very few or no qualifying issues, write a shorter, more precise paragraph rather than stretching to 6 sentences with unsupported claims.

// CONTENT RULES:
// - Mention specific class and method names for every issue you report.
// - Lead with and prioritize the genuine requirement violations that caused the failure — this is the main point of the paragraph.
// - If parts of the requirements ARE correctly implemented (per the WORKING CORRECTLY section), you may briefly acknowledge them for context, but the paragraph must stay focused on explaining the failure.
// - Be direct and educational, not vague.
// - Do NOT use the words: testcase, test case, test-case, TC, unit test, spec.
// - Do NOT use bullet points, numbered lists, or headers.
// - Write as one continuous paragraph only.
// - Every sentence must be complete — do not cut off.
// - Start the paragraph with exactly: "Student code has issues on"

// Return ONLY the paragraph. No JSON. No markdown. No extra text.`;

//   const reqEstimate = estimateTokens(prompt);
//   console.log(`  ✍️  Stage 2 — Report writing (request est: ~${reqEstimate} tokens)`);

//   const { text, provider, model, usage } = await llmCall({
//     task:        "analysis",
//     messages:    [{ role: "user", content: prompt }],
//     temperature: 0.2,
//     max_tokens:  700,
//   });

//   console.log(
//     `  ✅ Stage 2 done via [${provider}/${model}] — ` +
//     `tokens → prompt: ${usage?.promptTokens ?? "n/a"}, completion: ${usage?.completionTokens ?? "n/a"}, total: ${usage?.totalTokens ?? "n/a"}`
//   );

//   return {
//     text: text.trim(),
//     provider,
//     model,
//     usage: {
//       promptTokens:     usage?.promptTokens     ?? null,
//       completionTokens: usage?.completionTokens ?? null,
//       totalTokens:      usage?.totalTokens      ?? null,
//     },
//   };
// }

// // ── Main export ────────────────────────────────────────────────────────────────

// export async function analyzeStudentResult({
//   repoKey,
//   questionHtml,
//   studentName,
//   failedTestcases,
//   techStack = "puppeteer",
// }) {
//   const allowedExts  = STACK_EXTENSIONS[techStack] || ["js"];
//   const stackContext = STACK_CONTEXT[techStack]     || STACK_CONTEXT["puppeteer"];

//   // ── Discover repo structure ───────────────────────────────────────────────────
//   const appRoot = await discoverAppRoot(repoKey, techStack);

//   let scanPath;
//   if (techStack === "junit") {
//     scanPath = await findJavaSourceRoot(repoKey, appRoot);
//     console.log(`  📂 Java source root resolved to: "${scanPath}"`);
//   } else if (techStack === "nunit" || techStack === "pytest") {
//     scanPath = appRoot;
//   } else {
//     const tryWithSrc = [appRoot, "src"].filter(Boolean).join("/");
//     const srcItems   = await listGitHubFolder(repoKey, tryWithSrc);
//     scanPath = srcItems.length > 0 ? tryWithSrc : appRoot;
//   }

//   // ── Collect and score files ───────────────────────────────────────────────────
//   let fileList = await collectSourceFiles(repoKey, scanPath, allowedExts);
//   if (fileList.length === 0) {
//     console.warn(`  ⚠️  No files in "${scanPath}". Scanning full repo root...`);
//     fileList = await collectSourceFiles(repoKey, "", allowedExts);
//   }
//   if (fileList.length === 0) {
//     throw new Error(`No ${allowedExts.join("/")} source files found in repository`);
//   }

//   fileList.sort((a, b) => scoreFile(b.path) - scoreFile(a.path));

//   // ── Read files — token-aware budget ──────────────────────────────────────────
//   const CODE_CHAR_BUDGET = 14_000;
//   const topFiles         = fileList.slice(0, 10);

//   console.log(`  📄 Candidate files: ${topFiles.map(f => f.path).join(", ")}`);

//   const fileContents = [];
//   let   charsSoFar   = 0;

//   for (const file of topFiles) {
//     if (charsSoFar >= CODE_CHAR_BUDGET) break;
//     const content = await fetchGitHubFile(repoKey, file.path);
//     if (!content) continue;
//     const remaining = CODE_CHAR_BUDGET - charsSoFar;
//     const sliced    = content.slice(0, Math.min(4000, remaining));
//     fileContents.push({ path: file.path, content: sliced });
//     charsSoFar += sliced.length;
//   }

//   if (fileContents.length === 0) {
//     throw new Error("Could not read any source files from repository");
//   }

//   console.log(`  📦 Files loaded: ${fileContents.length} — total chars: ${charsSoFar}`);

//   const codeBlock = fileContents
//     .map(f => `// ===== ${f.path} =====\n${f.content}`)
//     .join("\n\n");

//   const questionText = stripHtml(questionHtml);
//   const failedTcText = failedTestcases.length > 0
//     ? failedTestcases.join(", ")
//     : "";

//   // ── Stage 1: Read and summarise the code ─────────────────────────────────────
//   const { summary: codeSummary, usage: usage1 } = await observeCode(codeBlock);

//   // ── Stage 2: Write final report ───────────────────────────────────────────────
//   const { text, provider, model, usage: usage2 } = await writeReport(
//     codeSummary,
//     questionText,
//     failedTcText,
//     stackContext
//   );

//   // ── Normalise output prefix ───────────────────────────────────────────────────
//   let analysis = text
//     .replace(/^```[a-z]*\s*/gi, "")
//     .replace(/```\s*$/gi, "")
//     .trim();

//   if (!analysis.toLowerCase().startsWith("student code has issues on")) {
//     if (analysis.toLowerCase().startsWith("student code has")) {
//       analysis = "Student code has issues on" + analysis.slice("student code has".length);
//     } else {
//       analysis = "Student code has issues on " + analysis;
//     }
//   }

//   // ── Strip any "test case" mentions that slipped through ──────────────────────
//   analysis = analysis
//     .replace(/\btest[\s-]?cases?\b/gi, "checks")
//     .replace(/\bunit[\s-]?tests?\b/gi, "validations")
//     .replace(/\b(TC|spec)\b/g, "check");

//   // ── Token usage summary for this question/student (1 call = 1 student × 1 question) ──
//   const tokenUsage = {
//     stage1: usage1,
//     stage2: usage2,
//     total: {
//       promptTokens:     (usage1.promptTokens     ?? 0) + (usage2.promptTokens     ?? 0),
//       completionTokens: (usage1.completionTokens ?? 0) + (usage2.completionTokens ?? 0),
//       totalTokens:      (usage1.totalTokens      ?? 0) + (usage2.totalTokens      ?? 0),
//     },
//   };

//   console.log(
//     `  ✅ Analysis complete via [${provider}/${model}] — ` +
//     `[${studentName || "Unknown"} | ${repoKey}] tokens → ` +
//     `prompt: ${tokenUsage.total.promptTokens}, completion: ${tokenUsage.total.completionTokens}, total: ${tokenUsage.total.totalTokens}`
//   );

//   return {
//     success:       true,
//     studentName:   studentName || "Unknown",
//     repoKey,
//     techStack,
//     filesAnalyzed: fileContents.map(f => f.path),
//     codeSummary,                      // stored for debugging
//     provider,
//     analysis,
//     tokenUsage,                       // per-call (1 student × 1 question) token breakdown
//   };
// }


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

// ── Stage 0: Requirement Extraction ─────────────────────────────────────────────
// Turns the raw question text into a clean, numbered checklist of TESTABLE
// requirements only (status codes, return types, specific field/method behaviors).
// No code involved here — pure requirement parsing. Stack-agnostic.

async function extractRequirements(questionText) {
  const prompt = `You are extracting a strict checklist of testable requirements from a programming question.

QUESTION TEXT:
${questionText}

YOUR JOB:
Produce a numbered checklist of every concrete, testable requirement stated in the question.
A testable requirement is something that can be directly checked against code: a specific status code, a specific return type, a specific method name or signature, a specific field behavior, a specific relationship or cascade behavior, a specific validation rule that is explicitly stated.

Rules:
- Only include requirements EXPLICITLY stated in the question text. Do not infer, assume, or add anything not written there.
- Do NOT include generic best-practice expectations (e.g. "should validate input", "should handle errors") unless the question explicitly states that exact behavior.
- Each line should be short and specific, e.g.: "DeleteClass returns 404 Not Found if class does not exist" or "CreateMember returns 201 Created with Location header on success".
- Number each item.
- If the question does not specify something, do not invent a requirement for it.

Return ONLY the numbered checklist. No extra text, no headers, no explanations.`;

  const reqEstimate = estimateTokens(prompt);
  console.log(`  📋 Stage 0 — Requirement extraction (request est: ~${reqEstimate} tokens)`);

  const { text, provider, model, usage } = await llmCall({
    task:        "requirement-extract",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens:  1200,
  });

  console.log(
    `  ✅ Stage 0 done via [${provider}/${model}] — ` +
    `tokens → prompt: ${usage?.promptTokens ?? "n/a"}, completion: ${usage?.completionTokens ?? "n/a"}, total: ${usage?.totalTokens ?? "n/a"}`
  );
  console.log(`  📋 Requirement checklist:\n${text}`);

  return {
    checklist: text.trim(),
    usage: {
      promptTokens:     usage?.promptTokens     ?? null,
      completionTokens: usage?.completionTokens ?? null,
      totalTokens:      usage?.totalTokens      ?? null,
    },
  };
}

// ── Stage 1: Code Summary ──────────────────────────────────────────────────────
// Reads the actual code and produces a structured summary:
//   - what classes/functions exist
//   - what's correctly implemented
//   - what looks wrong, incomplete, or incorrectly implemented (with literal code quotes)
// No question context. No stack assumptions. Pure code reading.

async function observeCode(codeBlock, requirementChecklist) {
  const prompt = `You are a code reader. Read the code below carefully and thoroughly.

Here is the checklist of requirements this code is supposed to satisfy (for tagging purposes only — do not let it change what you actually observe in the code):
${requirementChecklist}

Produce a structured summary with three sections:

STRUCTURE:
List every class, function, or method you see. One line each.
Format: <name> — <what it does, 10-15 words, describing actual logic not just a label>

WORKING CORRECTLY:
List what is properly implemented and functions as expected — correct logic, proper return types, correct status codes, proper validation, correct relationships, correct use of attributes/annotations, etc.
Be specific: name the class/method and explain what it does right.
If nothing stands out as notably correct, write "Standard implementation, no notable correct highlights."

ISSUES:
List every problem you can directly see in the code, independent of the checklist — read the code fully and report everything wrong that you can concretely observe.
Each issue MUST follow this exact format:
[REQUIRED or GENERAL] <ClassName.MethodName> — CODE: "<paste the exact relevant line(s) from the code, max 1-2 lines, verbatim, no paraphrasing>" — PROBLEM: <why this is wrong, referencing only what the quoted code actually does>
Tag an issue [REQUIRED] only if it directly violates a specific item in the requirement checklist above. Tag it [GENERAL] if it is a real code issue but does not correspond to anything in the checklist.
Do NOT describe an issue without quoting the literal code line that causes it. If you cannot quote the exact line that causes the problem, do not report the issue at all.
Do NOT guess what is missing based on general conventions, best practices, or "what a real-world app should have." Only report what you can concretely see is wrong or incomplete in the actual code in front of you.
Do NOT invent validation rules, business logic checks, or features that aren't present in the code — you are describing what exists and what's broken in what exists, not suggesting new features.
CRITICAL DISTINCTION — read carefully before writing each issue:
- If a check, validation, or piece of logic is completely ABSENT from the code (no relevant line exists at all), describe it as "missing" — e.g. "no null check exists before X".
- If a check, validation, or piece of logic IS present in the code but is logically wrong, backwards, or broken (wrong method call, wrong comparison, wrong condition, references the wrong variable, etc.), you MUST describe it as "incorrectly implemented" and explain exactly what it does versus what it should do. NEVER describe existing-but-broken logic as "missing", "does not have", or "does not validate" — that is a false claim. Quote the broken line and explain the actual behavior it produces.
One line per issue, but explain it fully — do not over-compress into a fragment.

CODE:
${codeBlock}

Return only the three sections. No extra text. No explanations outside the sections. Do not skip the WORKING CORRECTLY section even if short.`;

  const reqEstimate = estimateTokens(prompt);
  console.log(`  🔍 Stage 1 — Code observation (request est: ~${reqEstimate} tokens)`);

  const { text, provider, model, usage } = await llmCall({
    task:        "analysis-observe",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens:  1800,
  });

  console.log(
    `  ✅ Stage 1 done via [${provider}/${model}] — ` +
    `tokens → prompt: ${usage?.promptTokens ?? "n/a"}, completion: ${usage?.completionTokens ?? "n/a"}, total: ${usage?.totalTokens ?? "n/a"}`
  );
  console.log(`  📋 Code summary:\n${text}`);

  return {
    summary: text.trim(),
    usage: {
      promptTokens:     usage?.promptTokens     ?? null,
      completionTokens: usage?.completionTokens ?? null,
      totalTokens:      usage?.totalTokens      ?? null,
    },
  };
}

// ── Stage 2: Final Report ──────────────────────────────────────────────────────
// Takes the code summary + question requirements.
// Matches actual code issues against what the question expects.
// Filters out irrelevant generic observations AND forbids inventing requirements
// that aren't explicitly in the question text.
// Writes a natural flowing paragraph — no lists, no test case mentions.

async function writeReport(codeSummary, questionText, failedTcText, stackContext) {
  const prompt = `You are a senior code reviewer writing honest, accurate feedback for a student submission that failed evaluation.

TECH STACK CONTEXT:
${stackContext}

QUESTION REQUIREMENTS:
${questionText}
${failedTcText ? `\nFailed checks: ${failedTcText}` : ""}

CODE SUMMARY (structure, what works, and what's wrong, with literal code quotes — may include general observations not relevant to this question):
${codeSummary}

YOUR JOB:
Write an honest feedback paragraph of 3 to 6 sentences explaining why this submission failed, relative to what THIS QUESTION asks for.

HARD RULES — READ CAREFULLY:
1. The CODE SUMMARY's ISSUES section tags each issue as [REQUIRED] or [GENERAL]. You may ONLY mention issues tagged [REQUIRED]. NEVER mention a [GENERAL]-tagged issue, even briefly, even if it sounds important.
2. Do NOT invent validation rules, business logic checks, uniqueness checks, association checks, or "best practice" concerns that are not explicitly written in QUESTION REQUIREMENTS — even if they would be reasonable in a real-world API.
3. Before claiming a delete/cascade-related issue, check the OnDelete/cascade behavior stated in QUESTION REQUIREMENTS first — do not suggest a pre-delete check that would contradict an explicit cascade-delete requirement.
4. For every issue you mention, you must be able to point to the specific line or sentence in QUESTION REQUIREMENTS it violates. If you cannot point to that exact line, do not mention the issue.
5. Preserve the CODE SUMMARY's distinction between "missing" and "incorrectly implemented" exactly as written. NEVER rephrase an "incorrectly implemented" issue as "missing" or "not handled" — that misrepresents a broken-but-present check as absent, which is a factual error.
6. If there are zero [REQUIRED]-tagged issues, or very few, write a shorter, more precise paragraph rather than stretching to 6 sentences with unsupported [GENERAL] content.

CONTENT RULES:
- Mention specific class and method names for every issue you report.
- Lead with and prioritize the genuine requirement violations that caused the failure — this is the main point of the paragraph.
- If parts of the requirements ARE correctly implemented (per the WORKING CORRECTLY section), you may briefly acknowledge them for context, but the paragraph must stay focused on explaining the failure.
- Be direct and educational, not vague.
- Do NOT use the words: testcase, test case, test-case, TC, unit test, spec.
- Do NOT use bullet points, numbered lists, or headers.
- Write as one continuous paragraph only.
- Every sentence must be complete — do not cut off.
- Start the paragraph with exactly: "Student code has issues on"

Return ONLY the paragraph. No JSON. No markdown. No extra text.`;

  const reqEstimate = estimateTokens(prompt);
  console.log(`  ✍️  Stage 2 — Report writing (request est: ~${reqEstimate} tokens)`);

  const { text, provider, model, usage } = await llmCall({
    task:        "analysis",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens:  700,
  });

  console.log(
    `  ✅ Stage 2 done via [${provider}/${model}] — ` +
    `tokens → prompt: ${usage?.promptTokens ?? "n/a"}, completion: ${usage?.completionTokens ?? "n/a"}, total: ${usage?.totalTokens ?? "n/a"}`
  );

  return {
    text: text.trim(),
    provider,
    model,
    usage: {
      promptTokens:     usage?.promptTokens     ?? null,
      completionTokens: usage?.completionTokens ?? null,
      totalTokens:      usage?.totalTokens      ?? null,
    },
  };
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
  const CODE_CHAR_BUDGET = 14_000;
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

  // ── Stage 0: Extract testable requirement checklist from the question ────────
  const { checklist: requirementChecklist, usage: usage0 } = await extractRequirements(questionText);

  // ── Stage 1: Read and summarise the code, tagged against the checklist ───────
  const { summary: codeSummary, usage: usage1 } = await observeCode(codeBlock, requirementChecklist);

  // ── Stage 2: Write final report ───────────────────────────────────────────────
  const { text, provider, model, usage: usage2 } = await writeReport(
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

  // ── Token usage summary for this question/student (1 call = 1 student × 1 question) ──
  const tokenUsage = {
    stage0: usage0,
    stage1: usage1,
    stage2: usage2,
    total: {
      promptTokens:     (usage0.promptTokens     ?? 0) + (usage1.promptTokens     ?? 0) + (usage2.promptTokens     ?? 0),
      completionTokens: (usage0.completionTokens ?? 0) + (usage1.completionTokens ?? 0) + (usage2.completionTokens ?? 0),
      totalTokens:      (usage0.totalTokens      ?? 0) + (usage1.totalTokens      ?? 0) + (usage2.totalTokens      ?? 0),
    },
  };

  console.log(
    `  ✅ Analysis complete via [${provider}/${model}] — ` +
    `[${studentName || "Unknown"} | ${repoKey}] tokens → ` +
    `prompt: ${tokenUsage.total.promptTokens}, completion: ${tokenUsage.total.completionTokens}, total: ${tokenUsage.total.totalTokens}`
  );

  return {
    success:       true,
    studentName:   studentName || "Unknown",
    repoKey,
    techStack,
    filesAnalyzed: fileContents.map(f => f.path),
    requirementChecklist,             // stored for debugging — Stage 0 output
    codeSummary,                      // stored for debugging
    provider,
    analysis,
    tokenUsage,                       // per-call (1 student × 1 question) token breakdown
  };
}