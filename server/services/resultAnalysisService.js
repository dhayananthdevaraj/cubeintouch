// // services/resultAnalysisService.js
// import Groq from "groq-sdk";
// import dotenv from "dotenv";

// dotenv.config();

// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// const GITHUB_ORG   = "iamneo-production-2";
// const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // add to .env

// // ── GitHub helpers ─────────────────────────────────────────────────────────────

// async function fetchGitHubFile(repoKey, filePath) {
//   const url = `https://api.github.com/repos/${GITHUB_ORG}/${repoKey}/contents/${filePath}`;
//   const res = await fetch(url, {
//     headers: {
//       Authorization: `Bearer ${GITHUB_TOKEN}`,
//       Accept: "application/vnd.github.v3+json",
//       "User-Agent": "GoldenApp-ResultX",
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
//       Accept: "application/vnd.github.v3+json",
//       "User-Agent": "GoldenApp-ResultX",
//     },
//   });
//   if (!res.ok) return [];
//   const json = await res.json();
//   return Array.isArray(json) ? json : [];
// }

// async function collectFolderFiles(repoKey, folderPath, depth = 0) {
//   if (depth > 2) return [];
//   const items = await listGitHubFolder(repoKey, folderPath);
//   const files = [];
//   const CODE_EXTS = ["html", "css", "js", "jsx", "ts", "tsx", "json", "sql", "md", "txt"];

//   for (const item of items) {
//     if (item.type === "file") {
//       const ext = item.name.split(".").pop()?.toLowerCase();
//       if (CODE_EXTS.includes(ext) && item.size < 60000) {
//         files.push({ path: item.path, name: item.name });
//       }
//     } else if (item.type === "dir" && depth < 2) {
//       const subFiles = await collectFolderFiles(repoKey, item.path, depth + 1);
//       files.push(...subFiles);
//     }
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

// // ── main export ────────────────────────────────────────────────────────────────

// /**
//  * Fetch student code from GitHub public/ and analyze with Groq
//  * @param {Object} params
//  * @param {string} params.repoKey         - GitHub repo name (unique per student)
//  * @param {string} params.questionHtml    - Question description HTML from Examly
//  * @param {string} params.studentName     - Student name
//  * @param {Array}  params.failedTestcases - Names of failed testcases
//  * @returns {Promise<Object>}
//  */
// export async function analyzeStudentResult({ repoKey, questionHtml, studentName, failedTestcases }) {

//   // Step 1: collect files from public/
//   console.log(`  📂 Scanning public/ in ${repoKey}...`);
//   let fileList = await collectFolderFiles(repoKey, "public");

//   if (fileList.length === 0) {
//     console.warn(`  ⚠️  public/ empty — scanning root...`);
//     fileList = await collectFolderFiles(repoKey, "");
//   }

//   if (fileList.length === 0) {
//     throw new Error("No code files found in repository");
//   }

//   console.log(`  📄 Found ${fileList.length} file(s): ${fileList.map(f => f.path).join(", ")}`);

//   // Step 2: fetch file contents (max 10 files)
//   const fileContents = [];
//   for (const file of fileList.slice(0, 10)) {
//     const content = await fetchGitHubFile(repoKey, file.path);
//     if (content) {
//       fileContents.push({ path: file.path, content: content.slice(0, 8000) });
//     }
//   }

//   if (fileContents.length === 0) {
//     throw new Error("Could not read any files from repository");
//   }

//   // Step 3: build prompt
//   const questionText = stripHtml(questionHtml);
//   const failedTcText = failedTestcases.length > 0
//     ? `\nFailed test cases: ${failedTestcases.join(", ")}`
//     : "";
//   const codeBlock = fileContents
//     .map(f => `// ===== ${f.path} =====\n${f.content}`)
//     .join("\n\n");

//   const prompt = `
// You are a senior code reviewer analyzing a student's project submission for an educational platform.

// QUESTION REQUIREMENTS:
// ${questionText}
// ${failedTcText}

// STUDENT'S SUBMITTED CODE:
// ${codeBlock}

// YOUR JOB:
// Write a detailed analysis paragraph (5 to 6 sentences) reviewing the student's code against the question requirements.
// - Mention specific HTML element names, CSS properties, class names, or JS functions from their actual code.
// - Identify what is missing, incorrect, or poorly implemented.
// - Be direct and educational — this feedback will help the student improve.
// - Do NOT praise. Focus only on issues and gaps.
// - Write in plain paragraph form — no bullet points, no numbered lists, no headers.
// - Start the paragraph with: "Student code has"

// Return ONLY the paragraph text. No JSON. No markdown. No extra formatting.
// `;

//   // Step 4: Groq call
//   console.log(`  🤖 Sending to Groq...`);

//   const message = await groq.chat.completions.create({
//     model: "llama-3.3-70b-versatile",
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.4,
//     max_tokens: 500,
//   });

//   let analysis = message.choices[0].message.content.trim();

//   // clean any accidental markdown
//   analysis = analysis
//     .replace(/^```[a-z]*\s*/gi, "")
//     .replace(/```\s*$/gi, "")
//     .trim();

//   // ensure it starts correctly
//   if (!analysis.startsWith("Student code has")) {
//     analysis = "Student code has " + analysis;
//   }

//   return {
//     success:       true,
//     studentName:   studentName || "Unknown",
//     repoKey,
//     filesAnalyzed: fileContents.map(f => f.path),
//     analysis,
//   };
// }

// services/resultAnalysisService.js
// services/resultAnalysisService.js
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GITHUB_ORG   = "iamneo-production-2";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // add to .env

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

async function collectFolderFiles(repoKey, folderPath, depth = 0) {
  if (depth > 2) return [];
  const items = await listGitHubFolder(repoKey, folderPath);
  const files = [];
  const CODE_EXTS = ["html", "css", "js", "jsx", "ts", "tsx", "json", "sql", "md", "txt"];

  for (const item of items) {
    if (item.type === "file") {
      const ext = item.name.split(".").pop()?.toLowerCase();
      if (CODE_EXTS.includes(ext) && item.size < 60000) {
        files.push({ path: item.path, name: item.name });
      }
    } else if (item.type === "dir" && depth < 2) {
      const subFiles = await collectFolderFiles(repoKey, item.path, depth + 1);
      files.push(...subFiles);
    }
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

// ── main export ────────────────────────────────────────────────────────────────

// ── tech stack config ─────────────────────────────────────────────────────────

const STACK_FOLDER = {
  "puppeteer":  "public",
  "node-jest":  "src",
  "react-jest": "src",
  "karma":      "src",
  "junit":      "src",
  "nunit":      "src",
};

const STACK_CONTEXT = {
  "puppeteer":  "This is a web project tested with Puppeteer. Focus on HTML structure, CSS styling, and JavaScript DOM interactions in the public/ folder.",
  "node-jest":  "This is a Node.js backend project tested with Jest. Focus on module exports, function logic, async handling, and test coverage.",
  "react-jest": "This is a React project tested with React Testing Library + Jest. Focus on component structure, props, state management, and rendering logic.",
  "karma":      "This is an Angular/JS project tested with Karma. Focus on component logic, dependency injection, and test spec correctness.",
  "junit":      "This is a Java project tested with JUnit. Focus on class structure, method implementations, exception handling, and test assertions.",
  "nunit":      "This is a .NET/C# project tested with NUnit. Focus on class design, method correctness, async patterns, and test coverage.",
};

// ── main export ────────────────────────────────────────────────────────────────

export async function analyzeStudentResult({ repoKey, questionHtml, studentName, failedTestcases, techStack = "puppeteer" }) {

  const primaryFolder = STACK_FOLDER[techStack] || "public";
  const stackContext  = STACK_CONTEXT[techStack] || STACK_CONTEXT["puppeteer"];

  // Step 1: collect files from primary folder based on tech stack
  console.log(`  📂 Scanning ${primaryFolder}/ in ${repoKey} (stack: ${techStack})...`);
  let fileList = await collectFolderFiles(repoKey, primaryFolder);

  if (fileList.length === 0 && primaryFolder !== "") {
    console.warn(`  ⚠️  ${primaryFolder}/ empty — scanning root...`);
    fileList = await collectFolderFiles(repoKey, "");
  }

  if (fileList.length === 0) {
    throw new Error("No code files found in repository");
  }

  console.log(`  📄 Found ${fileList.length} file(s): ${fileList.map(f => f.path).join(", ")}`);

  // Step 2: fetch file contents (max 10 files)
  const fileContents = [];
  for (const file of fileList.slice(0, 10)) {
    const content = await fetchGitHubFile(repoKey, file.path);
    if (content) {
      fileContents.push({ path: file.path, content: content.slice(0, 8000) });
    }
  }

  if (fileContents.length === 0) {
    throw new Error("Could not read any files from repository");
  }

  // Step 3: build prompt with tech stack context
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
- Mention specific element names, class names, function names, or method names from their actual code.
- Identify what is missing, incorrect, or poorly implemented based on the tech stack above.
- Be direct and educational — this feedback will help the student improve.
- Do NOT praise. Focus only on issues and gaps.
- Write in plain paragraph form — no bullet points, no numbered lists, no headers.
- Start the paragraph with: "Student code has"

Return ONLY the paragraph text. No JSON. No markdown. No extra formatting.
`;

  // Step 4: Groq call — with retry on connection/rate errors
  console.log(`  🤖 Sending to Groq (tech: ${techStack})...`);

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
      break; // success
    } catch (groqErr) {
      const isRetryable = groqErr.message?.toLowerCase().includes("connection") ||
                          groqErr.message?.toLowerCase().includes("rate") ||
                          groqErr.status === 429 || groqErr.status >= 500;
      if (attempt < MAX_RETRIES && isRetryable) {
        const delay = attempt * 3000; // 3s, 6s
        console.warn(`  ⚠️  Groq attempt ${attempt} failed (${groqErr.message}), retrying in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw groqErr;
      }
    }
  }

  let analysis = message.choices[0].message.content.trim();

  // clean any accidental markdown
  analysis = analysis
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