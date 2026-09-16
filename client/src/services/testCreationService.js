// client/src/services/testCreationService.js
//
// Clean abstraction over Examly's test-creation flow, kept independent from
// the Test Packing matching/selection logic so the real endpoint details
// (confirmed below) can change without touching qbMatchingService.js or the
// UI. Mirrors the existing direct-browser-to-Examly write pattern already
// used by CODSyncPlatform/FileSyncPlatform/BlankSyncPlatform (same
// Authorization-header convention, same api.examly.io host).
//
// Confirmed flow (3 calls against a real Examly tenant):
//   1. POST /api/test            → creates a draft test, returns its id
//   2. PUT  /api/test/{id}       → attaches section(s) (name/duration) + group
//   3. PUT  /api/test/{id}       → attaches question ids per section
//
// Each call's body is the FULL current test object (Examly appears to treat
// the PUT bodies as cumulative snapshots, not partial patches) — so each step
// below builds on the previous step's body rather than re-deriving it.

const API = "https://api.examly.io";

function headersFor(token) {
  return { "Content-Type": "application/json", Authorization: token };
}

async function postJson(url, token, body) {
  const res = await fetch(url, { method: "POST", headers: headersFor(token), body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request to ${url} failed (HTTP ${res.status})`);
  return json;
}

async function putJson(url, token, body) {
  const res = await fetch(url, { method: "PUT", headers: headersFor(token), body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request to ${url} failed (HTTP ${res.status})`);
  return json;
}

/** Step 1 — create the draft test, get its id back */
export async function createTestShell({ token, testName, testType = "Manual Assessment Test", visibility = "Within Department", bdId, createdBy }) {
  const body = {
    testName,
    testType,
    visibility,
    b_d_id: bdId,
    createdBy,
    import: "original_test",
    mainDepartmentUser: true,
    publishStatus: "draft",
  };

  const json = await postJson(`${API}/api/test`, token, body);
  return { testId: json.data, body };
}

/** Step 2 — attach section(s) to the test created in step 1 */
export async function addSections({ token, testId, baseBody, sections }) {
  const body = {
    ...baseBody,
    group: sections.map((s) => ({ sectionName: s.name, groupList: [] })),
    sections: sections.map((s) => ({ name: s.name, duration: String(s.duration ?? "60"), additionalinfo: s.additionalinfo ?? null })),
  };

  await putJson(`${API}/api/test/${testId}`, token, body);
  return { body };
}

/**
 * Step 3 — attach the selected question ids, grouped by section. Pass
 * `publishStatus: "published"` to publish the test as part of this final
 * call (confirmed against a real trace: Examly accepts publishStatus on the
 * same PUT that carries `questions`); omit it to leave the test in draft.
 */
export async function addQuestions({ token, testId, baseBody, questionsBySection, publishStatus }) {
  const body = {
    ...baseBody,
    questions: questionsBySection, // [{ sectionName, questionList: [q_id, ...] }]
    ...(publishStatus ? { publishStatus } : {}),
  };

  await putJson(`${API}/api/test/${testId}`, token, body);
  return { body };
}

/**
 * Orchestrates all 3 steps. `testData` shape:
 *   { token, testName, testType?, visibility?, bdId, createdBy,
 *     sectionName?, duration?, questionIds: string[], publish?: boolean }
 *
 * `publish` defaults to false (draft) — the caller decides whether to flip
 * it, this service doesn't publish silently by default.
 *
 * Returns { testId, published } on success; throws with a message
 * identifying which step failed (createTestShell / addSections /
 * addQuestions) so a partially created draft test can be surfaced to the
 * user rather than silently lost.
 */
export async function createTest(testData) {
  const {
    token, testName, testType, visibility, bdId, createdBy,
    sectionName = "Section 1", duration = "60", questionIds, publish = false,
  } = testData;

  if (!questionIds?.length) throw new Error("No questions to add — selection is empty.");

  let testId;
  try {
    const shell = await createTestShell({ token, testName, testType, visibility, bdId, createdBy });
    testId = shell.testId;

    const withSections = await addSections({
      token, testId, baseBody: shell.body,
      sections: [{ name: sectionName, duration }],
    });

    await addQuestions({
      token, testId, baseBody: withSections.body,
      questionsBySection: [{ sectionName, questionList: questionIds }],
      publishStatus: publish ? "published" : undefined,
    });

    return { testId, published: publish };
  } catch (err) {
    if (testId) err.testId = testId; // let the caller show "test <id> was created but incomplete"
    throw err;
  }
}
