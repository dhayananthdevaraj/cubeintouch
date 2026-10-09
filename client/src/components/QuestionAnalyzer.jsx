// src/components/QuestionAnalyzer.jsx
//
// Full-page (not modal) preview analyzer for one COD/programming question at
// a time, with Prev/Next navigation across a QB's question list, a section
// filter panel that controls both what's displayed AND what gets copied, and
// a QB-wide "Copy All Questions" action. Renders purely from
// questionSections.extractQuestionSections(q) — it never fetches anything
// itself except via the `onRetry`/`onCopyAllQuestions` callbacks CODMedia.jsx
// owns; this component holds no token and calls no write endpoint, so it's
// read-only by construction.
import { useMemo, useState } from "react";
import { extractQuestionSections, combineSections, SECTION_KEYS } from "../pages/questionSections";
import { copyToClipboard } from "../utils/clipboard";
import "./QuestionAnalyzer.css";

// Grouping for the two-column layout and the filter panel — same keys
// questionSections.js produces, just split by which column they belong in.
const LEFT_KEYS = ["overview", "description", "inputFormat", "outputFormat", "constraints", "sampleTestcases"];
const RIGHT_KEYS = ["hiddenTestcases", "solution", "codeStub", "headerFooter", "whitelist", "mysqlSchema"];

function SectionBody({ section }) {
  if (!section.available) {
    return <p className="qa-empty">Not available for this question.</p>;
  }
  if (section.html) {
    return <div className="qa-html" dangerouslySetInnerHTML={{ __html: section.html }} />;
  }
  if (section.items) {
    return (
      <div className="qa-items">
        {section.items.map((item, i) => (
          <div className="qa-item-block" key={i}>
            <div className="qa-item-head">
              Test {i + 1}
              {item.difficulty && String(item.difficulty).trim() && item.difficulty !== "-" && (
                <span className="qa-item-tag">{item.difficulty}</span>
              )}
              {item.score != null && String(item.score).trim() && item.score !== "-" && (
                <span className="qa-item-tag">{item.score}%</span>
              )}
            </div>
            <div className="qa-item-row"><span>Input</span><pre>{item.input ?? ""}</pre></div>
            <div className="qa-item-row"><span>Expected Output</span><pre>{item.output ?? ""}</pre></div>
          </div>
        ))}
      </div>
    );
  }
  if (section.perLanguage) {
    return (
      <div className="qa-items">
        {section.perLanguage.map((entry, i) => (
          <div className="qa-item-block" key={i}>
            <div className="qa-item-head">{entry.language}</div>
            {entry.code != null && <pre className="qa-code">{entry.code}</pre>}
            {entry.header ? <div className="qa-item-row"><span>Header</span><pre className="qa-code">{entry.header}</pre></div> : null}
            {entry.footer ? <div className="qa-item-row"><span>Footer</span><pre className="qa-code">{entry.footer}</pre></div> : null}
            {entry.whitelist?.length ? <div className="qa-item-row"><span>Whitelist</span><pre>{entry.whitelist.join(", ")}</pre></div> : null}
            {entry.blacklist?.length ? <div className="qa-item-row"><span>Blacklist</span><pre>{entry.blacklist.join(", ")}</pre></div> : null}
            {entry.schema != null && <pre className="qa-code">{entry.schema}</pre>}
          </div>
        ))}
      </div>
    );
  }
  return <pre className="qa-plain">{section.text || "(empty)"}</pre>;
}

function SectionCard({ section, collapsed, onToggleCollapse, onCopy }) {
  return (
    <div className={`qa-section ${!section.available ? "qa-section--unavailable" : ""}`}>
      <div className="qa-section-head">
        <button className="qa-section-toggle" onClick={onToggleCollapse}>
          <span className="ctw-q-caret">{collapsed ? "▸" : "▾"}</span>
          <strong>{section.label}</strong>
        </button>
        {!section.available && <span className="ctw-badge">not available</span>}
        <span className="qa-section-spacer" />
        <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" disabled={!section.available} onClick={onCopy}>
          Copy
        </button>
      </div>
      {!collapsed && (
        <div className="qa-section-body">
          <SectionBody section={section} />
        </div>
      )}
    </div>
  );
}

function FilterPanel({ sections, selectedSections, onToggleSection, onSelectAll, onSelectNone }) {
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  const group = (keys, title) => (
    <div className="qa-filter-group">
      <h4>{title}</h4>
      {keys.map((key) => {
        const s = byKey[key];
        if (!s) return null;
        return (
          <label key={key} className="qa-filter-row">
            <input type="checkbox" checked={selectedSections.has(key)} onChange={() => onToggleSection(key)} />
            <span>{s.label}</span>
            {!s.available && <span className="qa-filter-unavailable">no data</span>}
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="qa-filter-panel">
      <div className="qa-filter-actions">
        <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={onSelectAll}>Select all</button>
        <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={onSelectNone}>Deselect all</button>
        <span className="ctw-muted">{selectedSections.size} of {SECTION_KEYS.length} selected</span>
      </div>
      <div className="qa-filter-groups">
        {group(LEFT_KEYS, "Problem Details")}
        {group(RIGHT_KEYS, "Code & Testcase Details")}
      </div>
    </div>
  );
}

export default function QuestionAnalyzer({
  qbName,
  questions,
  index,
  onIndexChange,
  onBack,
  onRetry,
  selectedSections,
  onToggleSection,
  onSelectAllSections,
  onSelectNoneSections,
  copyAllState,
  onCopyAllQuestions,
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const q = questions[index];
  const sections = useMemo(() => (q ? extractQuestionSections(q) : []), [q]);
  const byKey = useMemo(() => Object.fromEntries(sections.map((s) => [s.key, s])), [sections]);

  function flashToast(text, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 2200);
  }

  async function handleCopy(text, label) {
    const ok = await copyToClipboard(text);
    flashToast(ok ? `Copied: ${label}` : `Could not copy ${label}`, ok);
  }

  function toggleCollapsed(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const canPrev = index > 0;
  const canNext = index < questions.length - 1;
  const visibleLeft = LEFT_KEYS.filter((k) => selectedSections.has(k) && byKey[k]);
  const visibleRight = RIGHT_KEYS.filter((k) => selectedSections.has(k) && byKey[k]);

  return (
    <div className="qa-page">
      <div className="qa-toolbar">
        <div className="qa-toolbar-row">
          <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={onBack}>← Back to features</button>
          {qbName && <span className="qa-qb-name">{qbName}</span>}
          <div className="qa-nav">
            <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={() => onIndexChange(index - 1)} disabled={!canPrev}>← Prev</button>
            <span className="qa-counter">Question {questions.length ? index + 1 : 0} of {questions.length}</span>
            <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={() => onIndexChange(index + 1)} disabled={!canNext}>Next →</button>
          </div>
          <span className="qa-toolbar-spacer" />
          <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={() => setFiltersOpen((v) => !v)}>
            Filters ({selectedSections.size}/{SECTION_KEYS.length}) {filtersOpen ? "▴" : "▾"}
          </button>
          <button className="ctw-btn ctw-btn--primary ctw-btn--sm" onClick={onCopyAllQuestions} disabled={copyAllState.running}>
            {copyAllState.running ? `Copying... ${copyAllState.done}/${copyAllState.total}` : "Copy All Questions"}
          </button>
        </div>

        {q && (
          <div className="qa-toolbar-row">
            <span className="ctw-qid">{q.id}</span>
            <span className="qa-qtext">{q.questionText}</span>
          </div>
        )}

        {copyAllState.message && (
          <p className={copyAllState.ok === false ? "ctw-alert ctw-alert--error" : "ctw-status"}>{copyAllState.message}</p>
        )}

        {filtersOpen && (
          <FilterPanel
            sections={sections}
            selectedSections={selectedSections}
            onToggleSection={onToggleSection}
            onSelectAll={onSelectAllSections}
            onSelectNone={onSelectNoneSections}
          />
        )}
      </div>

      <div className="qa-body">
        {!q ? (
          <p className="qa-empty">No question selected.</p>
        ) : q.loading ? (
          <div className="qa-status-block">
            <div className="qa-spinner" />
            <p>Loading question detail… this can take a little while on a slow connection.</p>
          </div>
        ) : q.error ? (
          <div className="qa-status-block">
            <p className="qa-error-text">Failed to load: {q.error}</p>
            <button className="ctw-btn ctw-btn--primary ctw-btn--sm" onClick={() => onRetry(q.id)}>Retry</button>
          </div>
        ) : (
          <div className="qa-columns">
            <div className="qa-column">
              <h3 className="qa-column-title">Problem Details</h3>
              {visibleLeft.length === 0 && <p className="qa-empty">No sections selected for this column.</p>}
              {visibleLeft.map((key) => (
                <SectionCard
                  key={key}
                  section={byKey[key]}
                  collapsed={collapsed.has(key)}
                  onToggleCollapse={() => toggleCollapsed(key)}
                  onCopy={() => handleCopy(byKey[key].text, byKey[key].label)}
                />
              ))}
            </div>
            <div className="qa-column">
              <h3 className="qa-column-title">Code &amp; Testcase Details</h3>
              {visibleRight.length === 0 && <p className="qa-empty">No sections selected for this column.</p>}
              {visibleRight.map((key) => (
                <SectionCard
                  key={key}
                  section={byKey[key]}
                  collapsed={collapsed.has(key)}
                  onToggleCollapse={() => toggleCollapsed(key)}
                  onCopy={() => handleCopy(byKey[key].text, byKey[key].label)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {q && !q.loading && !q.error && (
        <div className="qa-bottom-bar">
          <button
            className="ctw-btn ctw-btn--primary"
            onClick={() => handleCopy(combineSections(sections, selectedSections), "current question")}
          >
            Copy Current Question
          </button>
        </div>
      )}

      {toast && <div className={`qa-toast ${toast.ok ? "qa-toast--ok" : "qa-toast--error"}`}>{toast.text}</div>}
    </div>
  );
}
