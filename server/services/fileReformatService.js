// // server/services/fileReformatService.js
// import { llmCall } from "./llmQueue.js";

// const SYSTEM = `You are a formatter for "file upload" assessment questions (essay / report / document-submission type).
// You convert raw, messy, or unstructured content into one or more structured question blocks.

// Output ONLY the block(s) below — no preamble, no explanation, no markdown code fences:

// ---QUESTION---
// TITLE: <short internal title, max ~8 words>
// DIFFICULTY: Easy|Medium|Hard
// BLOOMS: Knowledge|Comprehension|Application|Analysis|Synthesis|Evaluation
// TAGS: <comma,separated,keywords>
// FILE_SIZE: <max upload size in MB, integer>
// FILE_TYPES: <comma-separated extensions with dots, e.g. .pdf or .pdf,.docx>
// FILE_MANDATORY: Yes|No
// DESCRIPTION:
// <clean HTML using only <p>, <br>, <ul>, <li>, and <strong>. Include the full problem statement,
// an "Expected Coverage" section if implied, and a bold upload note stating the format and size limit.>
// ---END---

// Rules:
// - If the raw content clearly contains multiple distinct questions, emit multiple ---QUESTION--- blocks.
// - Never invent requirements that aren't implied by the raw content, but you MAY add a standard bold upload note.
// - DESCRIPTION must be valid HTML (no markdown). Use <ul><li> for lists and <strong> for emphasis.
// - If size / file type / difficulty / blooms are not stated, use the provided defaults.
// - Keep the candidate-facing wording; only clean up structure and formatting.`;

// export async function reformatFileQuestions({ raw, defaultDifficulty = "Medium", defaultBlooms = "Comprehension", defaultFileSize = 50, defaultFileTypes = ".pdf" }) {
//   const messages = [
//     { role: "system", content: SYSTEM },
//     {
//       role: "user",
//       content:
//         `Defaults (use when not stated in the content):\n` +
//         `- DIFFICULTY: ${defaultDifficulty}\n` +
//         `- BLOOMS: ${defaultBlooms}\n` +
//         `- FILE_SIZE: ${defaultFileSize}\n` +
//         `- FILE_TYPES: ${defaultFileTypes}\n` +
//         `- FILE_MANDATORY: Yes\n\n` +
//         `RAW CONTENT:\n${raw}`,
//     },
//   ];

//   const { text } = await llmCall({
//     task: "default",          // or add a "file-reformat" key to the model maps in llmQueue.js
//     messages,
//     temperature: 0.3,
//     max_tokens: 2500,
//   });

//   // Strip any stray code fences the model might add
//   return text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
// }


// server/services/fileReformatService.js
import { llmCall } from "./llmQueue.js";

const SYSTEM = `You are a formatter for "file upload" assessment questions (essay / report / document-submission type).
You convert raw, messy, or unstructured content into one or more structured question blocks.

Output ONLY the block(s) below — no preamble, no explanation, no markdown code fences:

---QUESTION---
TITLE: <short internal title, max ~8 words>
DIFFICULTY: Easy|Medium|Hard
BLOOMS: Knowledge|Comprehension|Application|Analysis|Synthesis|Evaluation
TAGS: <comma,separated,keywords>
DESCRIPTION:
<clean HTML using only <p>, <br>, <ul>, <li>, and <strong>. Include the full problem statement,
an "Expected Coverage" section if implied, and a bold upload note telling the candidate to submit
their work as a file (do not invent a specific format or size limit — that is configured separately).>
---END---

Rules:
- If the raw content clearly contains multiple distinct questions, emit multiple ---QUESTION--- blocks.
- Never invent requirements that aren't implied by the raw content.
- DESCRIPTION must be valid HTML (no markdown). Use <ul><li> for lists and <strong> for emphasis.
- If difficulty / blooms are not stated, use the provided defaults.
- Keep the candidate-facing wording; only clean up structure and formatting.`;

export async function reformatFileQuestions({ raw, defaultDifficulty = "Medium", defaultBlooms = "Comprehension" }) {
  const messages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content:
        `Defaults (use when not stated in the content):\n` +
        `- DIFFICULTY: ${defaultDifficulty}\n` +
        `- BLOOMS: ${defaultBlooms}\n\n` +
        `RAW CONTENT:\n${raw}`,
    },
  ];

  const { text } = await llmCall({
    task: "default",          // or add a "file-reformat" key to the model maps in llmQueue.js
    messages,
    temperature: 0.3,
    max_tokens: 2500,
  });

  // Strip any stray code fences the model might add
  return text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
}