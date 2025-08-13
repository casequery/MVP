import fs from "fs";
import path from "path";

const META_DIR = path.join(process.cwd(), "uploads", "meta");

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    const file = path.join(META_DIR, `${id}.json`);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ error: "Not found" });
    }
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    res.json({ document: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "fail" });
  }
}