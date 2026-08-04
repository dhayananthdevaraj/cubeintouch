

import { useState } from "react";
import "./WeightGen.css";

const FRAMEWORKS = {
  java: {
    label: "Java",
    sub: "JUnit @Test",
    icon: "☕",
    defaultWeight: 1,
    regex: /@Test[\s\S]*?\bvoid\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[A-Za-z0-9_,\s]+)?\s*\{/g,
  },
  react: {
    label: "React",
    sub: "Jest test/it",
    icon: "⚛️",
    defaultWeight: 1,
    regex: /\b(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g,
  },
  dotnet: {
    label: ".NET",
    sub: "NUnit [Test]",
    icon: "🔷",
    defaultWeight: 1,
    regex: /\[Test[^\]]*\]\s*(?:\[[^\]]*\]\s*)*public\s+(?:async\s+)?(?:void|Task)\s+([A-Za-z0-9_]+)\s*\(/g,
  },
};

export default function WeightGen() {
  const [framework, setFramework] = useState("java");
  const [sourceCode, setSourceCode] = useState("");
  const [totalWeight, setTotalWeight] = useState(FRAMEWORKS.java.defaultWeight);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedEcho, setCopiedEcho] = useState(false);

  const handleFrameworkChange = (key) => {
    setFramework(key);
    setTotalWeight(FRAMEWORKS[key].defaultWeight);
    setResult(null);
    setError("");
  };

  const buildEvenTestcases = (testNames, weight) => {
    const totalTests = testNames.length;
    const baseWeight = parseFloat((weight / totalTests).toFixed(3));

    const testcases = testNames.map((name) => ({
      name,
      weightage: baseWeight,
    }));

    const sum = testcases.reduce((a, b) => a + b.weightage, 0);
    const diff = parseFloat((weight - sum).toFixed(3));
    testcases[testcases.length - 1].weightage = parseFloat(
      (testcases[testcases.length - 1].weightage + diff).toFixed(3)
    );

    return { testcases, baseWeight };
  };

  const handleGenerate = () => {
    setError("");
    setResult(null);

    if (!sourceCode.trim()) {
      setError("Paste some test code first.");
      return;
    }

    const { regex } = FRAMEWORKS[framework];
    regex.lastIndex = 0;

    const testNames = [];
    let match;
    while ((match = regex.exec(sourceCode)) !== null) {
      testNames.push(match[1]);
    }

    if (testNames.length === 0) {
      setError(`No test cases found for ${FRAMEWORKS[framework].label}. Check the pasted code.`);
      return;
    }

    const weight = parseFloat(totalWeight) || 0;
    const { testcases, baseWeight } = buildEvenTestcases(testNames, weight);

    const failedEcho = testNames.map((name) => `echo "${name} FAILED";`);

    setResult({
      testNames,
      testcases,
      failedEcho,
      totalTests: testNames.length,
      baseWeight,
      totalWeight: weight,
    });
    setCopiedJson(false);
    setCopiedEcho(false);
  };

  // ── Customisable weightage: edit a single testcase's weight after generation ──
  const updateWeight = (idx, rawValue) => {
    setResult((prev) => {
      if (!prev) return prev;
      const nextTestcases = prev.testcases.map((tc, i) =>
        i === idx ? { ...tc, weightage: rawValue } : tc
      );
      return { ...prev, testcases: nextTestcases };
    });
  };

  // ── Reset back to an even split across all testcases ──
  const rebalanceEvenly = () => {
    setResult((prev) => {
      if (!prev) return prev;
      const { testcases, baseWeight } = buildEvenTestcases(prev.testNames, prev.totalWeight);
      return { ...prev, testcases, baseWeight };
    });
  };

  const copyToClipboard = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "json") {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 1500);
      } else {
        setCopiedEcho(true);
        setTimeout(() => setCopiedEcho(false), 1500);
      }
    } catch {
      setError("Copy failed — your browser may be blocking clipboard access.");
    }
  };

  const jsonOutput = result
    ? JSON.stringify(
        result.testcases.map((tc) => ({ ...tc, weightage: parseFloat(tc.weightage) || 0 })),
        null,
        2
      )
        .replace(/^\[\n/, "")   // remove opening [
        .replace(/\n\]$/, "")   // remove closing ]
    : "";

  const echoOutput = result ? result.failedEcho.join("\n") : "";
  const lineCount = sourceCode ? sourceCode.split("\n").length : 0;

  // ── Live sum of the (possibly hand-edited) weightages vs the target total ──
  const currentSum = result
    ? parseFloat(
        result.testcases.reduce((a, b) => a + (parseFloat(b.weightage) || 0), 0).toFixed(3)
      )
    : 0;
  const diffFromTarget = result ? parseFloat((result.totalWeight - currentSum).toFixed(3)) : 0;
  const isBalanced = Math.abs(diffFromTarget) < 0.001;

  return (
    <div className="wg-root">
      {/* Ambient glow */}
      <div className="wg-ambient">
        <div className="wg-orb wg-orb-1"></div>
        <div className="wg-orb wg-orb-2"></div>
      </div>

      {/* Header */}
      <div className="wg-header">
        <div className="wg-header-badge">
          <span className="wg-header-badge-dot"></span>
          Test Automation
        </div>
        <h1 className="wg-header-title">Weight<span className="wg-header-accent">Gen</span></h1>
        <p className="wg-header-sub">Extract testcases & auto-balance weightage across frameworks</p>
      </div>

      {/* Config card */}
      <div className="wg-panel wg-config">
        <div className="wg-field">
          <label className="wg-field-label">Framework</label>
          <div className="wg-fw-group">
            {Object.entries(FRAMEWORKS).map(([key, cfg]) => (
              <button
                key={key}
                className={`wg-fw-card ${framework === key ? "wg-fw-card--active" : ""}`}
                onClick={() => handleFrameworkChange(key)}
              >
                <span className="wg-fw-icon">{cfg.icon}</span>
                <span className="wg-fw-text">
                  <span className="wg-fw-label">{cfg.label}</span>
                  <span className="wg-fw-sub">{cfg.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="wg-field wg-field-inline">
          <label className="wg-field-label">Total Weight</label>
          <div className="wg-weight-box">
            <input
              type="number"
              step="0.001"
              className="wg-weight-input"
              value={totalWeight}
              onChange={(e) => setTotalWeight(e.target.value)}
            />
          </div>
        </div>

        <div className="wg-editor-wrap">
          <div className="wg-editor-head">
            <span className="wg-editor-dots">
              <span></span><span></span><span></span>
            </span>
            <span className="wg-editor-label">test-source.{framework === "dotnet" ? "cs" : framework === "react" ? "test.jsx" : "java"}</span>
            <span className="wg-editor-lines">{lineCount} lines</span>
          </div>
          <textarea
            className="wg-textarea"
            placeholder={`Paste your ${FRAMEWORKS[framework].label} test file content here...`}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
          />
        </div>

        <button className="wg-generate-btn" onClick={handleGenerate}>
          <span className="wg-generate-icon">⚖️</span>
          Generate Weightage
          <span className="wg-generate-shine"></span>
        </button>

        {error && (
          <div className="wg-error">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="wg-results">
          <div className="wg-stats">
            <div className="wg-stat">
              <span className="wg-stat-icon">🧪</span>
              <div>
                <div className="wg-stat-n">{result.totalTests}</div>
                <div className="wg-stat-l">Testcases</div>
              </div>
            </div>
            <div className="wg-stat">
              <span className="wg-stat-icon">⚖️</span>
              <div>
                <div className="wg-stat-n">{result.totalWeight}</div>
                <div className="wg-stat-l">Total Weight</div>
              </div>
            </div>
            <div className="wg-stat">
              <span className="wg-stat-icon">{isBalanced ? "✅" : "🔄"}</span>
              <div>
                <div className="wg-stat-n">{currentSum}</div>
                <div className="wg-stat-l">Current Sum</div>
              </div>
            </div>
          </div>

          {/* Customisable weightage — edit each testcase after generation */}
          <div className="wg-output-card wg-weights-card">
            <div className="wg-output-head wg-output-head--weights">
              <span className="wg-output-title"><span>🎛️</span> Adjust Weightage</span>
              <div className="wg-weights-head-right">
                <span className={`wg-balance-pill ${isBalanced ? "wg-balance-pill--ok" : "wg-balance-pill--off"}`}>
                  {isBalanced ? "✓ Balanced" : `⚠ Off by ${diffFromTarget}`}
                </span>
                <button className="wg-rebalance-btn" onClick={rebalanceEvenly}>
                  ↺ Even Split
                </button>
              </div>
            </div>
            <div className="wg-weight-list">
              {result.testcases.map((tc, idx) => (
                <div className="wg-weight-row" key={`${tc.name}-${idx}`}>
                  <span className="wg-weight-row-name">{tc.name}</span>
                  <input
                    type="number"
                    step="0.001"
                    className="wg-weight-row-input"
                    value={tc.weightage}
                    onChange={(e) => updateWeight(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="wg-output-card">
            <div className="wg-output-head wg-output-head--json">
              <span className="wg-output-title"><span>📦</span> Testcase JSON</span>
              <button className="wg-copy-btn" onClick={() => copyToClipboard(jsonOutput, "json")}>
                {copiedJson ? "✅ Copied" : "Copy"}
              </button>
            </div>
            <pre className="wg-pre wg-pre--json">{jsonOutput}</pre>
          </div>

          <div className="wg-output-card">
            <div className="wg-output-head wg-output-head--echo">
              <span className="wg-output-title"><span>🚫</span> Failed Echo Statements</span>
              <button className="wg-copy-btn" onClick={() => copyToClipboard(echoOutput, "echo")}>
                {copiedEcho ? "✅ Copied" : "Copy"}
              </button>
            </div>
            <pre className="wg-pre wg-pre--echo">{echoOutput}</pre>
          </div>
        </div>
      )}
    </div>
  );
}