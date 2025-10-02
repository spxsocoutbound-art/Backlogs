"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type ColumnMapping = {
  stationName?: string;
  clusterName?: string;
  mmType?: string;
  region?: string;
  missType?: string;
  dateColumn?: string;
};

function easeOutCubicLocal(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

type ToastType = "success" | "error" | "info";

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: ToastType;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onClose && onClose(), 4000);
    return () => clearTimeout(id);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div
      className={`${styles.toast} ${styles.show} ${
        type === "error" ? styles.error : styles.success
      }`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.toastIcon} aria-hidden="true" />
      <div>{message}</div>
    </div>
  );
}

function Stage({
  label,
  pct,
  showPulse,
  ariaId,
}: {
  label: string;
  pct: number;
  showPulse?: boolean;
  ariaId: string;
}) {
  return (
    <div className={styles.stageRow}>
      <div className={styles.stageLabel}>{label}</div>

      <div style={{ flex: 1 }}>
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-labelledby={ariaId}
        >
          <div
            className={styles.progressBar}
            style={{ width: `${pct}%` }}
          />

          <div className={styles.progressPercent}>
            <span id={ariaId} aria-live="polite" aria-atomic="true">
              {Math.round(pct)}%
            </span>
          </div>
        </div>
      </div>

      <div
        className={`${styles.pulse} ${showPulse ? styles.animate : ""}`}  
        style={{ visibility: showPulse ? "visible" : "hidden" }}
        aria-hidden={!showPulse}
        />
    </div>
  );
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [uploadDisabled, setUploadDisabled] = useState(true);
  const [resetDisabled, setResetDisabled] = useState(false);

  const [uploadPct, setUploadPct] = useState(0);
  const [procPct, setProcPct] = useState(0);
  const [expPct, setExpPct] = useState(0);

  const [uploadRunning, setUploadRunning] = useState(false);
  const [procRunning, setProcRunning] = useState(false);
  const [expRunning, setExpRunning] = useState(false);

  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  // New state for modern interface
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [mappingApplied, setMappingApplied] = useState(false);

  const logAreaRef = useRef<HTMLDivElement | null>(null);

  function log(message: string) {
    const logArea = logAreaRef.current;
    if (!logArea) return;
    const now = new Date().toLocaleTimeString();
    logArea.innerText = `[${now}] ${message}\n` + logArea.innerText;
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) {
      setSelectedFile(null);
      setUploadDisabled(true);
      setCsvHeaders([]);
      setShowPreview(false);
      setMappingApplied(false);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      alert("Please select a .zip file");
      setSelectedFile(null);
      setUploadDisabled(true);
      return;
    }
    setSelectedFile(file);
    setLastFile(file);
    setUploadDisabled(true); // Keep disabled until mapping is applied
    setShowPreview(false);
    setMappingApplied(false);
    log(
      `Selected ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    );

    // Extract headers from the first CSV in the ZIP
    try {
      const headers = await extractHeadersFromZip(file);
      setCsvHeaders(headers);
      log(`Found ${headers.length} columns in CSV files`);
    } catch (error) {
      console.error("Error extracting headers:", error);
      setToastType("error");
      setToastMsg("Failed to read CSV headers from ZIP file");
    }
  }

  async function extractHeadersFromZip(file: File): Promise<string[]> {
    const JSZip = (await import("jszip")).default;
    const Papa = (await import("papaparse")).default;
    
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    for (const [filename, entry] of Object.entries(zip.files)) {
      if (filename.toLowerCase().endsWith(".csv")) {
        const content = await entry.async("string");
        const parsed = Papa.parse(content, { header: false, skipEmptyLines: true });
        if (parsed.data && parsed.data.length > 0) {
          return (parsed.data[0] as string[]) || [];
        }
      }
    }
    throw new Error("No CSV files found in ZIP");
  }

  function handleApplyMapping() {
    if (!selectedFile || csvHeaders.length === 0) return;
    
    // Validate that required mappings are set
    const requiredMappings = ['stationName', 'dateColumn'];
    const missingMappings = requiredMappings.filter(key => !columnMapping[key as keyof ColumnMapping]);
    
    if (missingMappings.length > 0) {
      setToastType("error");
      setToastMsg(`Please select columns for: ${missingMappings.join(', ')}`);
      return;
    }

    setMappingApplied(true);
    setUploadDisabled(false);
    log("Column mapping applied successfully");
    
    // Generate preview data
    generatePreview();
  }

  async function generatePreview() {
    if (!selectedFile) return;
    
    try {
      // This would normally call a preview endpoint, but for now we'll simulate
      const mockPreview = [
        csvHeaders,
        ["Sample Station", "Sample Cluster", "Sample MM Type", "Sample Region", "Late Depart", "2025-09-30 08:44:05"],
        ["Another Station", "Another Cluster", "Another MM Type", "Another Region", "Late Loading", "2025-09-30 09:15:22"],
        ["Third Station", "Third Cluster", "Third MM Type", "Third Region", "Late Seal", "2025-09-30 10:30:45"]
      ];
      
      setPreviewData(mockPreview);
      setShowPreview(true);
      log("Preview generated with sample data");
    } catch (error) {
      console.error("Error generating preview:", error);
      setToastType("error");
      setToastMsg("Failed to generate preview");
    }
  }

  function resetAll() {
    setSelectedFile(null);
    setLastFile(null);
    setUploadDisabled(true);
    setResetDisabled(false);
    setUploadPct(0);
    setProcPct(0);
    setExpPct(0);
    setUploadRunning(false);
    setProcRunning(false);
    setExpRunning(false);
    setCsvHeaders([]);
    setColumnMapping({});
    setPreviewData([]);
    setShowPreview(false);
    setMappingApplied(false);
    if (logAreaRef.current)
      logAreaRef.current.innerText = "Ready. Select a ZIP file to begin.";
  }

  function downloadSampleCsv() {
    const csv = "ColA,ColB,ColC\n1,Station,foo\n2,SOC 5,bar\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function simulateProgress(
    setPct: (n: number) => void,
    duration = 3000,
    cap = 92
  ) {
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const pct = Math.round(easeOutCubicLocal(t) * cap);
      setPct(pct);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  async function doUpload(fileToSend: File | null) {
    if (!fileToSend || !mappingApplied) return;
    setUploadDisabled(true);
    setResetDisabled(true);
    setUploadRunning(true);
    setProcRunning(true);
    setExpRunning(true);
    log("Starting upload...");

    const form = new FormData();
    form.append("zip", fileToSend);
    form.append("columnMapping", JSON.stringify(columnMapping));

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const p = Math.round((e.loaded / e.total) * 100);
          setUploadPct(p);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          try {
            if (xhr.status === 200) {
              const res = JSON.parse(xhr.responseText);
              if (res.ok) {
                setUploadPct(100);
                setProcPct(100);
                setExpPct(100);
                log("Completed: " + (res.message || "Done"));
                setToastType("success");
                setToastMsg(res.message || "Exported to Google Sheets");
              } else {
                setToastType("error");
                setToastMsg(res.message || "Unknown error");
                log("Error: " + (res.message || "Unknown error"));
              }
            } else {
              setToastType("error");
              setToastMsg("Server error: " + xhr.status);
              log("Server error: " + xhr.statusText);
            }
          } catch {
            log("Invalid server response");
            setToastType("error");
            setToastMsg("Invalid server response");
          } finally {
            setUploadRunning(false);
            setProcRunning(false);
            setExpRunning(false);
            setUploadDisabled(false);
            setResetDisabled(false);
          }
        }
      };

      xhr.send(form);

      simulateProgress(setProcPct, 4000, 92);
      simulateProgress(setExpPct, 6000, 88);
    } catch (err) {
      console.error(err);
      log("Upload failed");
      setToastType("error");
      setToastMsg("Upload failed");
      setUploadDisabled(false);
      setResetDisabled(false);
    }
  }

  async function handleUpload() {
    await doUpload(selectedFile ?? lastFile);
  }

  function handleRetry() {
    if (lastFile) doUpload(lastFile);
  }

  useEffect(() => {
    if (logAreaRef.current && !logAreaRef.current.innerText) {
      logAreaRef.current.innerText = "Ready. Select a ZIP file to begin.";
    }
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div>
              <h2 className={styles.headerTitle}><strong>SOC_Packed Generated File</strong></h2>
              <p className={styles.headerLead}>
                Upload ZIP Folder..
              </p>
            </div>
          </div>
          <div className="muted">
            Target Sheet:{" "}
            {process.env.NEXT_PUBLIC_TARGET_SHEET_NAME || "data_integration"}
          </div>
        </header>

        <section className={styles.card}>
          {/* File Upload Section */}
          <div className={styles.row}>
            <div className={styles.col}>
              <div className={styles.uploader}>
                <input
                  id="zipInput"
                  type="file"
                  accept=".zip"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <div className={styles.fileNote}>
                  Max allowed per extracted CSV file: 25 MB
                </div>
              </div>
            </div>
          </div>

          {/* Column Mapping Section */}
          {csvHeaders.length > 0 && (
            <div className={styles.mappingSection}>
              <h3 className={styles.sectionTitle}>Column Mapping</h3>
              <div className={styles.mappingGrid}>
                <div className={styles.mappingItem}>
                  <label className={styles.mappingLabel}>Station Name *</label>
                  <select 
                    className={styles.dropdown}
                    value={columnMapping.stationName || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, stationName: e.target.value }))}
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.mappingItem}>
                  <label className={styles.mappingLabel}>Cluster Name</label>
                  <select 
                    className={styles.dropdown}
                    value={columnMapping.clusterName || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, clusterName: e.target.value }))}
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.mappingItem}>
                  <label className={styles.mappingLabel}>MM Type</label>
                  <select 
                    className={styles.dropdown}
                    value={columnMapping.mmType || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, mmType: e.target.value }))}
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.mappingItem}>
                  <label className={styles.mappingLabel}>Region</label>
                  <select 
                    className={styles.dropdown}
                    value={columnMapping.region || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, region: e.target.value }))}
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.mappingItem}>
                  <label className={styles.mappingLabel}>Miss Type/Remarks</label>
                  <select 
                    className={styles.dropdown}
                    value={columnMapping.missType || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, missType: e.target.value }))}
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.mappingItem}>
                  <label className={styles.mappingLabel}>Date Column *</label>
                  <select 
                    className={styles.dropdown}
                    value={columnMapping.dateColumn || ''}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, dateColumn: e.target.value }))}
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.buttonsRow}>
                <button
                  className={styles.buttonPrimary}
                  onClick={handleApplyMapping}
                  disabled={!selectedFile || csvHeaders.length === 0}
                >
                  Apply Mapping
                </button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {showPreview && (
            <div className={styles.previewSection}>
              <h3 className={styles.sectionTitle}>Preview</h3>
              <div className={styles.previewTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {previewData[0]?.map((header, idx) => (
                        <th key={idx} className={styles.tableHeader}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(1, 4).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className={styles.tableCell}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={styles.previewNote}>
                  Showing first 3 rows of processed data
                </div>
              </div>
            </div>
          )}

          {/* Upload Section */}
          {mappingApplied && (
            <div className={styles.uploadSection}>
              <div className={styles.row}>
                <div className={styles.col}>
                  <div className={styles.buttonsRow}>
                    <button
                      className={styles.buttonPrimary}
                      onClick={handleUpload}
                      disabled={uploadDisabled}
                    >
                      Upload & Process
                    </button>
                    <button
                      className={styles.buttonGhost}
                      onClick={handleRetry}
                      disabled={!lastFile}
                    >
                      Retry
                    </button>
                  </div>
                </div>

                <div style={{ minWidth: 260 }}>
                  <Stage
                    label="Upload"
                    pct={uploadPct}
                    showPulse={uploadRunning}
                    ariaId="upload-pct"
                  />
                  <Stage
                    label="Processing"
                    pct={procPct}
                    showPulse={procRunning}
                    ariaId="proc-pct"
                  />
                  <Stage
                    label="Export"
                    pct={expPct}
                    showPulse={expRunning}
                    ariaId="exp-pct"
                  />
                </div>
              </div>
            </div>
          )}

          <div className={styles.logs} id="logArea" ref={logAreaRef} />

          <div className={styles.footer}>
            <div className={styles.buttonsRow}>
              <button
                id="resetBtn"
                className={styles.buttonGhost}
                onClick={resetAll}
                disabled={resetDisabled}
              >
                Reset
              </button>
              <button
                id="downloadSample"
                className={styles.buttonGhost}
                onClick={downloadSampleCsv}
              >
                Download Sample CSV
              </button>
            </div>
            <div className="muted">
              Made for quick integration. v 1.0.0
            </div>
          </div>
        </section>
      </div>

      <div aria-live="polite" aria-atomic="true">
        <Toast
          message={toastMsg}
          type={toastType}
          onClose={() => setToastMsg("")}
        />
      </div>
    </div>
  );
}
