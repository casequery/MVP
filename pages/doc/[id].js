import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function DocPage() {
  const router = useRouter();
  const { id } = router.query;
  const [doc, setDoc] = useState(null);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/doc/${id}`).then(r => r.json()).then(j => setDoc(j.document));
  }, [id]);

  async function ask(e) {
    e.preventDefault();
    if (!q.trim()) return;
    const userMsg = { sender: "user", content: q };
    setMessages(prev => [...prev, userMsg]);
    setQ("");
    const res = await fetch(`/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: id, question: userMsg.content })
    });
    const json = await res.json();
    if (json.success) {
      setMessages(prev => [...prev, { sender: "assistant", content: json.response }]);
    } else {
      setMessages(prev => [...prev, { sender: "assistant", content: "Error: " + (json.error || "unknown") }]);
    }
  }

  if (!doc) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "Inter, Arial" }}>
      <h1>{doc.originalName}</h1>
      <p>{doc.pageCount} pages</p>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, minHeight: 200 }}>
        {messages.length === 0 ? <p>Ask something about this document.</p> : messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <b>{m.sender === "user" ? "You" : "CaseQuery" }:</b> {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={ask} style={{ marginTop: 12 }}>
        <input style={{ width: "70%", padding: 8 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Ask a question..." />
        <button style={{ marginLeft: 8 }}>Ask</button>
      </form>
    </div>
  );
}