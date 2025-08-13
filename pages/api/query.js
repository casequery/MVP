import OpenAI from "openai";
import { PineconeClient } from "@pinecone-database/pinecone";

async function initOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function initPinecone() {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT
  });
  return client.Index(process.env.PINECONE_INDEX);
}

export default async function handler(req, res) {
  try {
    const { documentId, question } = req.body;
    if (!documentId || !question) return res.status(400).json({ error: "documentId and question required" });

    const openai = await initOpenAI();
    const pineIndex = await initPinecone();

    // Create embedding for question
    const qEmb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question
    });
    const queryVector = qEmb.data[0].embedding;

    // Query Pinecone
    const queryResponse = await pineIndex.query({
      queryRequest: {
        vector: queryVector,
        topK: 4,
        includeMetadata: true
      }
    });

    const matches = (queryResponse.matches || []).filter(m => (m.metadata && m.metadata.docId === documentId));
    const topSnippets = matches.slice(0, 4).map(m => `Source: ${m.metadata.originalName} (chunk ${m.metadata.chunkIndex})\n\n${m.metadata.snippet}`);

    // Build prompt with top snippets
    const system = {
      role: "system",
      content: "You are a concise legal-document assistant. Answer only using the provided document snippets. Cite the snippet source (file name and chunk). If the answer isn't in the snippets, say you can't find it and suggest a next step."
    };
    const userMsg = {
      role: "user",
      content: `QUESTION: ${question}\n\nCONTEXT:\n${topSnippets.join("\n\n---\n\n")}`
    };

    // Call Chat API (gpt-3.5-turbo for cost control)
    const chatResp = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [system, userMsg],
      max_tokens: 400
    });

    const answer = chatResp.choices?.[0]?.message?.content || "No answer";

    return res.json({ success: true, response: answer });
  } catch (e) {
    console.error("query error", e);
    return res.status(500).json({ error: "Query failed", details: e.message });
  }
}