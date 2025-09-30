"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDisabled, setUploadDisabled] = useState(true);
  const [resetDisabled, setResetDisabled] = useState(false);
  const uploadBarRef = useRef<HTMLDivElement>(null);
  const procBarRef = useRef<HTMLDivElement>(null);
  const expBarRef = useRef<HTMLDivElement>(null);
  const logAreaRef = useRef<HTMLDivElement>(null);

  function log(message: string) {
    const logArea = logAreaRef.current;
    if (!logArea) return;
    const now = new Date().toLocaleTimeString();
    logArea.innerText = `[${now}] ${message}\n` + logArea.innerText;
  }

  function handleFileChange(file: File | undefined) {
    if (!file) {
      setSelectedFile(null);
      setUploadDisabled(true);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      alert("Please select a .zip file");
      setSelectedFile(null);
      setUploadDisabled(true);
      return;
    }
    setSelectedFile(file);
    setUploadDisabled(false);
    log(`Selected ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  function resetAll() {
    setSelectedFile(null);
    setUploadDisabled(true);
    setResetDisabled(false);
    if (uploadBarRef.current) uploadBarRef.current.style.width = "0%";
    if (procBarRef.current) procBarRef.current.style.width = "0%";
    if (expBarRef.current) expBarRef.current.style.width = "0%";
    if (logAreaRef.current) logAreaRef.current.innerText = "Ready. Select a ZIP file to begin.";
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

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadDisabled(true);
    setResetDisabled(true);
    log("Starting upload...");

    const form = new FormData();
    form.append("zip", selectedFile);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && uploadBarRef.current) {
          const p = Math.round((e.loaded / e.total) * 100);
          uploadBarRef.current.style.width = `${p}%`;
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          try {
            if (xhr.status === 200) {
              const res = JSON.parse(xhr.responseText);
              if (res.ok) {
                if (uploadBarRef.current) uploadBarRef.current.style.width = "100%";
                if (procBarRef.current) procBarRef.current.style.width = "100%";
                if (expBarRef.current) expBarRef.current.style.width = "100%";
                log("Completed: " + (res.message || "Done"));
                alert("Success: Data exported to Google Sheets");
              } else {
                log("Error: " + (res.message || "Unknown error"));
                alert("Error: " + (res.message || "Unknown error"));
              }
            } else {
              log("Server error: " + xhr.statusText);
              alert("Server error: " + xhr.status);
            }
          } catch (e) {
            log("Invalid server response");
          }
          setUploadDisabled(false);
          setResetDisabled(false);
        }
      };

      xhr.send(form);

      // Simulated progress bars while server works
      let p = 0;
      const t1 = setInterval(() => {
        p += 5;
        if (procBarRef.current) {
          procBarRef.current.style.width = `${Math.min(90, p)}%`;
        }
        if (p >= 90) clearInterval(t1);
      }, 600);
      let q = 0;
      const t2 = setInterval(() => {
        q += 4;
        if (expBarRef.current) {
          expBarRef.current.style.width = `${Math.min(80, q)}%`;
        }
        if (q >= 80) clearInterval(t2);
      }, 900);
      } catch (err) {
      console.error(err as unknown);
      log("Upload failed");
      setUploadDisabled(false);
      setResetDisabled(false);
    }
  }

  useEffect(() => {
    // Initialize log text
    if (logAreaRef.current && !logAreaRef.current.innerText) {
      logAreaRef.current.innerText = "Ready. Select a ZIP file to begin.";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ color: "#e6eef6" }}>
      <div className="wrap">
        <header>
          <div className="brand">
            <div className="logo">SS</div>
            <div>
              <h1>SeaTalk — CSV ZIP → Google Sheets</h1>
              <p className="lead">Upload a ZIP of CSVs. Files are cleaned, merged, sorted, and exported to Google Sheets.</p>
            </div>
          </div>
          <div className="muted">Target Sheet: {process.env.NEXT_PUBLIC_TARGET_SHEET_NAME || "data_integration"}</div>
        </header>

        <section className="card">
          <div className="row">
            <div className="col">
              <label className="muted">Choose ZIP file (.zip)</label>
              <div className="uploader" style={{ marginTop: 8 }}>
                <input
                  id="zipInput"
                  type="file"
                  accept=".zip"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <button id="uploadBtn" onClick={handleUpload} disabled={uploadDisabled}>
                  Upload & Run
                </button>
              </div>
              <div style={{ marginTop: 8 }} className="muted">Max allowed per extracted CSV file: 25 MB</div>
            </div>

            <div style={{ minWidth: 260 }}>
              <div style={{ marginBottom: 10 }}>
                <small className="muted">Upload</small>
                <div className="progress" style={{ marginTop: 6 }}>
                  <div ref={uploadBarRef} id="uploadBar" className="bar" />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <small className="muted">Processing</small>
                <div className="progress" style={{ marginTop: 6 }}>
                  <div ref={procBarRef} id="procBar" className="bar" />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <small className="muted">Export</small>
                <div className="progress" style={{ marginTop: 6 }}>
                  <div ref={expBarRef} id="expBar" className="bar" />
                </div>
              </div>
            </div>
          </div>

          <div className="logs" id="logArea" ref={logAreaRef} />

          <div className="footer">
            <div style={{ display: "flex", gap: 8 }}>
              <button id="resetBtn" className="ghost" onClick={resetAll} disabled={resetDisabled}>
                Reset
              </button>
              <button id="downloadSample" className="ghost" onClick={downloadSampleCsv}>
                Download Sample CSV
              </button>
            </div>
            <div className="muted">Made for quick integration. SeaTalk Spark Agent</div>
          </div>
        </section>
      </div>
    </div>
  );
}
