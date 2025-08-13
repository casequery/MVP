import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { PineconeClient } from "@pinecone-database/pinecone";

export const config = { api: { bodyParser: false } };

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const META_DIR = path.join(UPLOAD_DIR, "meta");
const CHUNK_SIZE = 1500; // characters per chunk — tune as needed
const OVERLAP = 200;

async function ensureDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(META_DIR)) fs.mkdirSync(META_DIR, { recursive: true });
}

function chunkText(text) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const piece = text.slice(i, i + CHUNK_SIZE);
    chunks.push(piece);
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

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
  await ensureDirs();

  const form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.uploadDir = UPLOAD_DIR;

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error("formidable err", err);
        return res.status(500).json({ error: "Upload failed" });
      }
      const pdfFile = files.pdfFile;
      if (!pdfFile) return res.status(400).json({ error: "No file provided" });

      // Read PDF and extract text
      const buffer = fs.readFileSync(pdfFile.path);
      const data = await pdfParse(buffer);
      const text = data.text || "";
      const pageCount = data.numpages || 0;

      // Create document metadata
      const docId = uuidv4();
      const meta = {
        id: docId,
        originalName: pdfFile.name || pdfFile.originalFilename || pdfFile.newFilename || "uploaded.pdf",
        filename: path.basename(pdfFile.path),
        size: pdfFile.size || buffer.length,
        pageCount,
        uploadedAt: new Date().toISOString(),
        filePath: pdfFile.path
      };

      // Save metadata file
      fs.writeFileSync(path.join(META_DIR, `${docId}.json`), JSON.stringify(meta, null, 2));

      // Chunk & embed
      const chunks = chunkText(text);

      // init clients
      const openai = await initOpenAI();
      const pineIndex = await initPinecone();

      // create embeddings in batches
      const vectors = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        if (!chunk) continue;
        // Create embedding
        const emb = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk
        });
        const vector = emb.data[0].embedding;
        const id = `${docId}::${i}`;
        vectors.push({
          id,
          metadata: {
            docId,
            originalName: meta.originalName,
            chunkIndex: i,
            snippet: chunk.slice(0, 300)
          },
          values: vector
        });

        // upsert in batches of 50
        if (vectors.length >= 50) {
          await pineIndex.upsert({ upsertRequest: { vectors } });
          vectors.length = 0;
        }
      }
      if (vectors.length > 0) {
        await pineIndex.upsert({ upsertRequest: { vectors } });
      }

      return res.json({ success: true, document: { id: docId, originalName: meta.originalName, pageCount } });
    } catch (e) {
      console.error("upload handler err", e);
      return res.status(500).json({ error: "Processing failed", details: e.message });
    }
  });
}