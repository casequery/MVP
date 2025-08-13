import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export default async function handler(req, res) {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    // Keep a simple index by reading JSON files in uploads/metadata
    const metaDir = path.join(UPLOAD_DIR, "meta");
    let docs = [];
    if (fs.existsSync(metaDir)) {
      const files = fs.readdirSync(metaDir);
      docs = files.map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(metaDir, f), "utf8"));
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }
    res.json({ documents: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "listing failed" });
  }
}