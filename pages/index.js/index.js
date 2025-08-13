import { useState, useEffect } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/list").then(r => r.json()).then(d => setDocs(d.documents || []));
  }, []);

  async function upload(e) {
    e.preventDefault();
    if (!file) return alert("Choose a PDF first");
    setStatus("Uploading...");
    const fd = new FormData();
    fd.append("pdfFile", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) {
      setStatus("Uploaded: " + json.document.originalName);
      const resp = await fetch("/api/list");
      const jl = await resp.json();
      setDocs(jl.documents || []);
    } else {
      setStatus("Upload failed: " + (json.error || "unknown error"));
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Inter, Arial" }}>
      <h1>CaseQuery — Upload PDF</h1>
      <p>Upload a PDF (text-based preferred). This starter indexes the file for search.</p>
      <form onSubmit={upload}>
        <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} />
        <button style={{ marginLeft: 10 }}>Upload</button>
      </form>
      <p>{status}</p>

      <h2>Indexed Documents</h2>
      <ul>
        {docs.map(d => (
          <li key={d.id}>
            <a href={`/doc/${d.id}`}>{d.originalName}</a> — {d.pageCount} pages
          </li>
        ))}
      </ul>
    </div>
  );
}