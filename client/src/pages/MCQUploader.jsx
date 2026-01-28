// src/pages/MCQUploader.jsx
import { useState } from "react";
import "./MCQUploader.css";
import { B_D_ID_OPTIONS } from "../config";

const API = "https://api.examly.io";

export default function MCQUploader() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("examly_token") || "";
    } catch {
      return "";
    }
  });
  const [ui, setUI] = useState(token ? "setup" : "welcome");
  const [tokenInput, setTokenInput] = useState("");
  
  // QB Setup
  const [qbMode, setQbMode] = useState("create"); // "create" or "search"
  const [qbName, setQbName] = useState("");
  const [qbCode, setQbCode] = useState("");
  const [qbDescription, setQbDescription] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState([]); // Changed to array for multi-select
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [createdQB, setCreatedQB] = useState(null);
  
  // QB Search
  const [qbSearchTerm, setQbSearchTerm] = useState("");
  const [qbSearchResults, setQbSearchResults] = useState([]);
  const [selectedQB, setSelectedQB] = useState(null);
  
  // JSON Input
  const [jsonInput, setJsonInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  // Upload State
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadResults, setUploadResults] = useState(null);
  const [alert, setAlert] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");

  // Batch settings
  const [batchSize, setBatchSize] = useState(5);

  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const showOverlay = (msg) => {
    setOverlayText(msg);
    setOverlay(true);
  };

  const hideOverlay = () => setOverlay(false);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const saveToken = () => {
    if (!tokenInput.trim()) {
      showAlert("Token cannot be empty", "danger");
      return;
    }
    try {
      localStorage.setItem("examly_token", tokenInput.trim());
      setToken(tokenInput.trim());
      setTokenInput("");
      setUI("setup");
      showAlert("Token saved successfully!", "success");
    } catch (err) {
      showAlert("Failed to save token: " + err.message, "danger");
    }
  };

  const clearToken = () => {
    try {
      localStorage.removeItem("examly_token");
    } catch (err) {
      console.error("Failed to clear token:", err);
    }
    setToken("");
    setUI("welcome");
    setTokenInput("");
    resetAll();
    showAlert("Token cleared", "danger");
  };

  const resetAll = () => {
    setQbMode("create");
    setQbName("");
    setQbCode("");
    setQbDescription("");
    setSelectedDepartments([]); // Reset to empty array
    setDepartmentSearch("");
    setCreatedQB(null);
    setQbSearchTerm("");
    setQbSearchResults([]);
    setSelectedQB(null);
    setJsonInput("");
    setSelectedFile(null);
    setParsedQuestions([]);
    setUploadResults(null);
    setShowPreview(false);
    setPreviewIndex(0);
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  // Filter departments based on search
  const filteredDepartments = B_D_ID_OPTIONS.filter(dept =>
    dept.label.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  // Search QB
  const searchQuestionBanks = async () => {
    if (!qbSearchTerm.trim()) {
      showAlert("Please enter a search term", "warning");
      return;
    }

    showOverlay("🔍 Searching question banks...");

    try {
      const response = await fetch(`${API}/api/questionbanks/all`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          department_id: B_D_ID_OPTIONS.map(d => d.department_id),
          limit: 50,
          mainDepartmentUser: true,
          page: 1,
          search: qbSearchTerm
        })
      });

      const result = await response.json();
      const qbs = result?.questionbanks || [];

      setQbSearchResults(qbs);
      hideOverlay();

      if (qbs.length === 0) {
        showAlert("No question banks found", "warning");
      } else {
        showAlert(`Found ${qbs.length} question bank(s)`, "success");
      }
    } catch (err) {
      hideOverlay();
      showAlert("Error searching QBs: " + err.message, "danger");
      console.error(err);
    }
  };

  const selectExistingQB = (qb) => {
    setSelectedQB(qb);
    setCreatedQB({
      qb_id: qb.qb_id,
      qb_name: qb.qb_name,
      createdBy: qb.user_id || "system"
    });
    setUI("upload");
    showAlert(`Selected QB: ${qb.qb_name}`, "success");
  };

  // Download sample JSON
  const downloadSampleJSON = () => {
    const sampleData = [
      {
        "difficultyLevel": "Medium",
        "subtopic": "Manipulating Data by Using DML Statements",
        "questionDescription": "What is the effect of this MySQL UPDATE statement?",
        "hascodeSnippet": true,
        "codeSnippet": "UPDATE Products\nSET price = price * 0.85\nWHERE discontinued = 1;",
        "options": [
          "Increases price by 85% for discontinued products",
          "Decreases price by 15% for discontinued products",
          "Sets price to 0.85 for all products",
          "Adds 0.85 to price for discontinued products"
        ],
        "correctOptionIndex": 1,
        "tags": "UPDATE, arithmetic operations"
      },
      {
        "difficultyLevel": "Easy",
        "subtopic": "Basic SQL Queries",
        "questionDescription": "Which SQL keyword is used to retrieve data from a database?",
        "hascodeSnippet": false,
        "codeSnippet": "",
        "options": [
          "GET",
          "SELECT",
          "FETCH",
          "RETRIEVE"
        ],
        "correctOptionIndex": 1,
        "tags": "SELECT, basics"
      }
    ];

    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mcq_sample_format.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showAlert("📥 Sample JSON downloaded!", "success");
  };

  // Create QB
  const createQuestionBank = async () => {
    if (!qbName.trim()) {
      showAlert("QB Name is required", "danger");
      return;
    }

    if (selectedDepartments.length === 0) {
      showAlert("Please select at least one department", "danger");
      return;
    }

    showOverlay("🔨 Creating Question Bank...");

    try {
      const response = await fetch(`${API}/api/questionbank/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          qb_name: qbName,
          qb_code: qbCode || null,
          qb_description: qbDescription || null,
          tags: [],
          b_d_id: selectedDepartments, // Send full department objects, not just values
          departmentChanged: true,
          visibility: "Within Department",
          price: 0,
          mainDepartmentUser: true
        })
      });

      const result = await response.json();

      if (result.statusCode === 200 && result.data.success) {
        const qbData = result.data.data.data;
        setCreatedQB({
          qb_id: qbData.qb_id,
          qb_name: qbData.qb_name,
          createdBy: qbData.createdBy
        });
        setUI("upload");
        hideOverlay();
        showAlert("✅ Question Bank created successfully!", "success");
      } else {
        throw new Error(result.data.message || "Failed to create QB");
      }
    } catch (err) {
      hideOverlay();
      showAlert("Error creating QB: " + err.message, "danger");
      console.error(err);
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.match(/\.json$/i)) {
        showAlert("Please select a JSON file", "danger");
        e.target.value = "";
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          setJsonInput(content);
          setSelectedFile(file);
          showAlert(`File "${file.name}" loaded`, "success");
        } catch (err) {
          showAlert("Error reading file: " + err.message, "danger");
        }
      };
      reader.readAsText(file);
    }
  };

  // Parse and validate JSON
  const parseJSON = () => {
    if (!jsonInput.trim()) {
      showAlert("Please provide JSON input", "warning");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const questions = Array.isArray(parsed) ? parsed : [parsed];
      
      // Validate structure
      const validQuestions = questions.filter(q => 
        q.questionDescription && 
        q.options && 
        Array.isArray(q.options) &&
        q.correctOptionIndex !== undefined
      );

      if (validQuestions.length === 0) {
        showAlert("No valid questions found in JSON", "danger");
        return;
      }

      setParsedQuestions(validQuestions);
      showAlert(`✅ Parsed ${validQuestions.length} valid question(s)`, "success");
    } catch (err) {
      showAlert("Invalid JSON format: " + err.message, "danger");
    }
  };

  // Convert JSON format to API format
  const convertToAPIFormat = (question, qbId, userId) => {
    const optionsArray = question.options.map(opt => ({
      text: `<p>${opt}</p>`,
      media: ""
    }));

    const correctAnswer = optionsArray[question.correctOptionIndex]?.text || "";

    let questionData = `<p>${question.questionDescription}</p>`;
    
    // Add code snippet if present
    if (question.hascodeSnippet && question.codeSnippet) {
      questionData += `$$$examly${question.codeSnippet}`;
    }

    return {
      question_type: "mcq_single_correct",
      question_data: questionData,
      options: optionsArray,
      answer: {
        args: [correctAnswer],
        partial: []
      },
      subject_id: null,
      topic_id: null,
      sub_topic_id: null,
      blooms_taxonomy: null,
      course_outcome: null,
      program_outcome: null,
      hint: [],
      answer_explanation: {
        args: []
      },
      manual_difficulty: question.difficultyLevel || "Medium",
      question_editor_type: question.hascodeSnippet ? 3 : 1,
      linked_concepts: "",
      tags: question.tags ? [question.tags] : [""],
      question_media: [],
      qb_id: qbId,
      createdBy: userId
    };
  };

  // Upload questions in batches
  const uploadQuestions = async () => {
    if (parsedQuestions.length === 0) {
      showAlert("Please parse JSON first", "warning");
      return;
    }

    if (!createdQB) {
      showAlert("No Question Bank selected", "danger");
      return;
    }

    setIsLoading(true);
    showOverlay("🔄 Starting batch upload...");

    const results = {
      total: parsedQuestions.length,
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      const userId = createdQB.createdBy || "system";

      // Process in batches
      for (let i = 0; i < parsedQuestions.length; i += batchSize) {
        const batch = parsedQuestions.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(parsedQuestions.length / batchSize);

        showOverlay(`📦 Processing batch ${batchNumber}/${totalBatches}...`);
        setUploadProgress({ 
          current: i, 
          total: parsedQuestions.length 
        });

        const batchPromises = batch.map(async (question, idx) => {
          const globalIdx = i + idx;
          try {
            const payload = convertToAPIFormat(question, createdQB.qb_id, userId);
            
            const response = await fetch(`${API}/api/mcq_question/create`, {
              method: "POST",
              headers,
              body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
              results.success++;
              console.log(`✅ Question ${globalIdx + 1} uploaded: ${result.q_id}`);
              return { success: true, index: globalIdx };
            } else {
              throw new Error(result.message || "Upload failed");
            }
          } catch (err) {
            results.failed++;
            results.errors.push({
              index: globalIdx + 1,
              question: question.questionDescription?.substring(0, 50) + "...",
              error: err.message
            });
            console.error(`❌ Question ${globalIdx + 1} failed:`, err);
            return { success: false, index: globalIdx, error: err.message };
          }
        });

        await Promise.all(batchPromises);

        if (i + batchSize < parsedQuestions.length) {
          await sleep(300);
        }
      }

      setUploadProgress({ 
        current: parsedQuestions.length, 
        total: parsedQuestions.length 
      });

      setUploadResults(results);
      hideOverlay();
      
      if (results.failed === 0) {
        showAlert(`🎉 All ${results.success} questions uploaded successfully!`, "success");
      } else {
        showAlert(
          `⚠️ Uploaded ${results.success} questions, ${results.failed} failed`,
          "warning"
        );
      }

      setUI("results");
    } catch (err) {
      hideOverlay();
      showAlert("Error during upload: " + err.message, "danger");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset for new upload
  const startNewUpload = () => {
    setJsonInput("");
    setSelectedFile(null);
    setParsedQuestions([]);
    setUploadResults(null);
    setUploadProgress({ current: 0, total: 0 });
    setShowPreview(false);
    setPreviewIndex(0);
    setUI("upload");
    if (document.getElementById("file-input")) {
      document.getElementById("file-input").value = "";
    }
  };

  // Preview navigation
  const nextQuestion = () => {
    if (previewIndex < parsedQuestions.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  return (
    <div className="mcq-uploader-container">
      {overlay && (
        <div className="mcq-overlay">
          <div className="mcq-overlay-content">
            <div className="mcq-spinner"></div>
            <div className="mcq-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {alert && (
        <div className={`mcq-alert mcq-alert-${alert.type}`}>
          {alert.msg}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && parsedQuestions.length > 0 && (
        <div className="mcq-preview-modal" onClick={() => setShowPreview(false)}>
          <div className="mcq-preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="mcq-preview-modal-header">
              <h3>Question Preview ({previewIndex + 1} of {parsedQuestions.length})</h3>
              <button 
                className="mcq-preview-close" 
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>

            <div className="mcq-preview-modal-body">
              {(() => {
                const q = parsedQuestions[previewIndex];
                return (
                  <>
                    <div className="mcq-preview-meta">
                      <span className="mcq-preview-difficulty">{q.difficultyLevel}</span>
                      <span className="mcq-preview-subtopic">{q.subtopic}</span>
                      {q.tags && <span className="mcq-preview-tags">🏷️ {q.tags}</span>}
                    </div>

                    <div className="mcq-preview-question">
                      <h4>Question:</h4>
                      <p>{q.questionDescription}</p>
                    </div>

                    {q.hascodeSnippet && q.codeSnippet && (
                      <div className="mcq-preview-code">
                        <h4>Code Snippet:</h4>
                        <pre><code>{q.codeSnippet}</code></pre>
                      </div>
                    )}

                    <div className="mcq-preview-options">
                      <h4>Options:</h4>
                      {q.options.map((opt, idx) => (
                        <div 
                          key={idx} 
                          className={`mcq-preview-option ${idx === q.correctOptionIndex ? 'correct' : ''}`}
                        >
                          <span className="mcq-option-letter">{String.fromCharCode(65 + idx)}.</span>
                          <span className="mcq-option-text">{opt}</span>
                          {idx === q.correctOptionIndex && (
                            <span className="mcq-correct-badge">✓ Correct</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="mcq-preview-modal-footer">
              <button
                onClick={prevQuestion}
                disabled={previewIndex === 0}
                className="mcq-button mcq-button-secondary mcq-button-small"
              >
                ← Previous
              </button>
              <span className="mcq-preview-counter">
                {previewIndex + 1} / {parsedQuestions.length}
              </span>
              <button
                onClick={nextQuestion}
                disabled={previewIndex === parsedQuestions.length - 1}
                className="mcq-button mcq-button-secondary mcq-button-small"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Screen */}
      {ui === "welcome" && (
        <div className="mcq-welcome">
          <div className="mcq-welcome-icon">📤</div>
          <h2 className="mcq-welcome-title">MCQ Bulk Uploader</h2>
          <p className="mcq-welcome-subtitle">Upload JSON files with MCQ questions</p>

          <textarea
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your Authorization token here..."
            className="mcq-token-input"
          />

          <button onClick={saveToken} className="mcq-button mcq-button-primary">
            Save Token & Continue
          </button>

          <p className="mcq-token-hint">
            💡 Your token will be saved securely for future sessions
          </p>
        </div>
      )}

      {/* QB Setup Screen */}
      {ui === "setup" && (
        <div className="mcq-card">
          <div className="mcq-header">
            <h3 className="mcq-title">🏗️ Question Bank Setup</h3>
            <div className="mcq-header-actions">
              <button
                onClick={clearToken}
                className="mcq-button mcq-button-danger mcq-button-small"
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mcq-mode-toggle">
            <button
              onClick={() => setQbMode("create")}
              className={`mcq-mode-button ${qbMode === "create" ? "active" : ""}`}
            >
              ➕ Create New QB
            </button>
            <button
              onClick={() => setQbMode("search")}
              className={`mcq-mode-button ${qbMode === "search" ? "active" : ""}`}
            >
              🔍 Search Existing QB
            </button>
          </div>

          {/* Create QB Mode */}
          {qbMode === "create" && (
            <div className="mcq-form-section">
              <div className="mcq-form-group">
                <label className="mcq-label">Question Bank Name *</label>
                <input
                  type="text"
                  value={qbName}
                  onChange={(e) => setQbName(e.target.value)}
                  placeholder="Enter QB name..."
                  className="mcq-input"
                />
              </div>

              <div className="mcq-form-group">
                <label className="mcq-label">QB Code (Optional)</label>
                <input
                  type="text"
                  value={qbCode}
                  onChange={(e) => setQbCode(e.target.value)}
                  placeholder="Enter QB code..."
                  className="mcq-input"
                />
              </div>

              <div className="mcq-form-group">
                <label className="mcq-label">Description (Optional)</label>
                <textarea
                  value={qbDescription}
                  onChange={(e) => setQbDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="mcq-textarea"
                  rows="2"
                />
              </div>

              <div className="mcq-form-group">
                <label className="mcq-label">Department * (Searchable - Multi-select)</label>
                <input
                  type="text"
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  placeholder="🔍 Search department... (e.g., LTI, Track 1, HR)"
                  className="mcq-input mcq-search-input"
                />
                <div className="mcq-department-dropdown">
                  {filteredDepartments.slice(0, 10).map((dept, idx) => {
                    const isSelected = selectedDepartments.some(d => d.value === dept.value);
                    return (
                      <div
                        key={idx}
                        className={`mcq-department-item ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          if (isSelected) {
                            // Remove department
                            setSelectedDepartments(
                              selectedDepartments.filter(d => d.value !== dept.value)
                            );
                          } else {
                            // Add department
                            setSelectedDepartments([...selectedDepartments, dept]);
                          }
                        }}
                      >
                        <div className="mcq-dept-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mcq-dept-checkbox"
                          />
                          <span className="mcq-dept-label">{dept.label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredDepartments.length === 0 && (
                    <div className="mcq-department-empty">No departments found</div>
                  )}
                  {filteredDepartments.length > 10 && (
                    <div className="mcq-department-more">
                      + {filteredDepartments.length - 10} more... (keep typing to filter)
                    </div>
                  )}
                </div>

                {/* Selected Departments Chips */}
                {selectedDepartments.length > 0 && (
                  <div className="mcq-selected-departments">
                    {selectedDepartments.map((dept) => (
                      <div key={dept.value} className="mcq-dept-chip">
                        <span>{dept.label}</span>
                        <button
                          onClick={() => {
                            setSelectedDepartments(
                              selectedDepartments.filter(d => d.value !== dept.value)
                            );
                          }}
                          className="mcq-dept-chip-remove"
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={createQuestionBank}
                disabled={!qbName.trim() || selectedDepartments.length === 0}
                className={`mcq-button mcq-button-success ${
                  (!qbName.trim() || selectedDepartments.length === 0) ? "mcq-button-disabled" : ""
                }`}
              >
                🔨 Create Question Bank
              </button>
            </div>
          )}

          {/* Search QB Mode */}
          {qbMode === "search" && (
            <div className="mcq-form-section">
              <div className="mcq-form-group">
                <label className="mcq-label">Search Question Bank</label>
                <input
                  type="text"
                  value={qbSearchTerm}
                  onChange={(e) => setQbSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchQuestionBanks()}
                  placeholder="Enter QB name to search..."
                  className="mcq-input"
                />
              </div>

              <button
                onClick={searchQuestionBanks}
                disabled={!qbSearchTerm.trim()}
                className={`mcq-button mcq-button-primary ${
                  !qbSearchTerm.trim() ? "mcq-button-disabled" : ""
                }`}
              >
                🔍 Search Question Banks
              </button>

              {qbSearchResults.length > 0 && (
                <div className="mcq-qb-results">
                  <h4 className="mcq-results-title">
                    Found {qbSearchResults.length} Question Bank(s)
                  </h4>
                  <div className="mcq-qb-list">
                    {qbSearchResults.map((qb, idx) => (
                      <div key={idx} className="mcq-qb-item">
                        <div className="mcq-qb-info">
                          <div className="mcq-qb-name">{qb.qb_name}</div>
                          <div className="mcq-qb-meta">
                            <span>{qb.questionCount || 0} questions</span>
                            <span>•</span>
                            <span>{qb.user_role}</span>
                            <span>•</span>
                            <span className="mcq-qb-id">{qb.qb_id.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <button
                          onClick={() => selectExistingQB(qb)}
                          className="mcq-button mcq-button-success mcq-button-small"
                        >
                          ✓ Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Screen */}
      {ui === "upload" && createdQB && (
        <div className="mcq-card">
          <div className="mcq-header">
            <div>
              <h3 className="mcq-title">📤 Upload MCQ Questions</h3>
              <p className="mcq-qb-info">
                📚 QB: <strong>{createdQB.qb_name}</strong> ({createdQB.qb_id.slice(0, 8)}...)
              </p>
            </div>
            <div className="mcq-header-actions">
              <button
                onClick={() => {
                  setUI("setup");
                  setCreatedQB(null);
                  setSelectedQB(null);
                  setJsonInput("");
                  setSelectedFile(null);
                  setParsedQuestions([]);
                  if (document.getElementById("file-input")) {
                    document.getElementById("file-input").value = "";
                  }
                }}
                className="mcq-button mcq-button-secondary mcq-button-small"
              >
                ← Back
              </button>
              <button
                onClick={clearToken}
                className="mcq-button mcq-button-danger mcq-button-small"
              >
                🚪 Logout
              </button>
            </div>
          </div>

          <div className="mcq-upload-section">
            {/* Sample Download */}
            <div className="mcq-sample-section">
              <button
                onClick={downloadSampleJSON}
                className="mcq-button mcq-button-info mcq-button-small"
              >
                📥 Download Sample JSON Format
              </button>
            </div>

            {/* File Upload */}
            <div className="mcq-upload-methods">
              <div className="mcq-method-card">
                <h4 className="mcq-method-title">📁 Upload JSON File</h4>
                <input
                  type="file"
                  id="file-input"
                  accept=".json"
                  onChange={handleFileChange}
                  className="mcq-file-input"
                />
                <label htmlFor="file-input" className="mcq-file-label">
                  <span className="mcq-file-icon">📂</span>
                  <span className="mcq-file-text">
                    {selectedFile ? selectedFile.name : "Choose JSON File"}
                  </span>
                </label>
              </div>

              <div className="mcq-divider">
                <span>OR</span>
              </div>

              <div className="mcq-method-card">
                <h4 className="mcq-method-title">📝 Paste JSON</h4>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='[{"difficultyLevel": "Medium", "subtopic": "SQL", "questionDescription": "What is SELECT?", ...}]'
                  className="mcq-json-textarea"
                />
              </div>
            </div>

            {/* Batch Size Setting */}
            <div className="mcq-settings-section">
              <label className="mcq-label">
                Batch Size: <strong>{batchSize}</strong> questions per batch
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                className="mcq-slider"
              />
              <p className="mcq-hint">
                💡 Smaller batches = more stable, Larger batches = faster
              </p>
            </div>

            {/* Parse Button */}
            <button
              onClick={parseJSON}
              disabled={!jsonInput.trim()}
              className={`mcq-button mcq-button-primary ${
                !jsonInput.trim() ? "mcq-button-disabled" : ""
              }`}
            >
              🔍 Parse & Validate JSON
            </button>

            {/* Parsed Questions Preview */}
            {parsedQuestions.length > 0 && (
              <div className="mcq-preview-section">
                <div className="mcq-preview-header">
                  <h4 className="mcq-preview-title">
                    ✅ {parsedQuestions.length} Question(s) Ready
                  </h4>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="mcq-button mcq-button-info mcq-button-small"
                  >
                    👁️ Preview All Questions
                  </button>
                </div>

                <div className="mcq-preview-list">
                  {parsedQuestions.slice(0, 3).map((q, idx) => (
                    <div key={idx} className="mcq-preview-item">
                      <span className="mcq-preview-number">Q{idx + 1}</span>
                      <span className="mcq-preview-text">
                        {q.questionDescription.substring(0, 80)}...
                      </span>
                      <span className="mcq-preview-badge">
                        {q.difficultyLevel}
                      </span>
                    </div>
                  ))}
                  {parsedQuestions.length > 3 && (
                    <div className="mcq-preview-more">
                      + {parsedQuestions.length - 3} more questions
                    </div>
                  )}
                </div>

                <button
                  onClick={uploadQuestions}
                  disabled={isLoading}
                  className={`mcq-button mcq-button-success ${
                    isLoading ? "mcq-button-disabled" : ""
                  }`}
                >
                  {isLoading 
                    ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
                    : `🚀 Upload ${parsedQuestions.length} Question(s)`
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Screen */}
      {ui === "results" && uploadResults && (
        <div className="mcq-card">
          <div className="mcq-result-section">
            <div className="mcq-result-icon">
              {uploadResults.failed === 0 ? "🎉" : "⚠️"}
            </div>
            <h3 className="mcq-result-title">Upload Complete!</h3>

            <div className="mcq-result-stats">
              <div className="mcq-stat-card mcq-stat-info">
                <div className="mcq-stat-icon">📊</div>
                <div className="mcq-stat-content">
                  <div className="mcq-stat-value">{uploadResults.total}</div>
                  <div className="mcq-stat-label">Total Questions</div>
                </div>
              </div>

              <div className="mcq-stat-card mcq-stat-success">
                <div className="mcq-stat-icon">✅</div>
                <div className="mcq-stat-content">
                  <div className="mcq-stat-value">{uploadResults.success}</div>
                  <div className="mcq-stat-label">Uploaded</div>
                </div>
              </div>

              {uploadResults.failed > 0 && (
                <div className="mcq-stat-card mcq-stat-error">
                  <div className="mcq-stat-icon">❌</div>
                  <div className="mcq-stat-content">
                    <div className="mcq-stat-value">{uploadResults.failed}</div>
                    <div className="mcq-stat-label">Failed</div>
                  </div>
                </div>
              )}
            </div>

            {uploadResults.errors.length > 0 && (
              <div className="mcq-errors-section">
                <h4 className="mcq-errors-title">⚠️ Errors Details</h4>
                <div className="mcq-errors-list">
                  {uploadResults.errors.map((err, idx) => (
                    <div key={idx} className="mcq-error-item">
                      <span className="mcq-error-index">Q{err.index}</span>
                      <div className="mcq-error-details">
                        <div className="mcq-error-question">{err.question}</div>
                        <div className="mcq-error-message">{err.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mcq-result-actions">
              <button
                onClick={startNewUpload}
                className="mcq-button mcq-button-primary"
              >
                📤 Upload More Questions
              </button>
              <button
                onClick={() => {
                  resetAll();
                  setUI("setup");
                }}
                className="mcq-button mcq-button-secondary"
              >
                🏗️ Create New QB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}