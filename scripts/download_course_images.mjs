import { mkdirSync, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetDir = path.resolve(__dirname, "..", "public", "images", "courses");

mkdirSync(targetDir, { recursive: true });

const images = [
  { name: "javascript.jpg", url: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=600&q=80" },
  { name: "react.jpg", url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80" },
  { name: "postgres.jpg", url: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80" },
  { name: "nodejs.jpg", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80" },
  { name: "typescript.jpg", url: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&w=600&q=80" },
  { name: "uxui.jpg", url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=600&q=80" },
  { name: "python.jpg", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80" },
  { name: "docker.jpg", url: "https://images.unsplash.com/photo-1605745341112-85968b19335b?auto=format&fit=crop&w=600&q=80" },
  { name: "testing.jpg", url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80" },
  { name: "git.jpg", url: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=600&q=80" },
  { name: "machine-learning.jpg", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80" },
  { name: "ia-innovacion.jpg", url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80" },
  { name: "accesibilidad.jpg", url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80" },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    options.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    };
    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status: ${res.statusCode}`));
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
      file.on("error", (err) => {
        reject(err);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log(`Guardando imágenes en: ${targetDir}`);
  for (const img of images) {
    const filePath = path.join(targetDir, img.name);
    process.stdout.write(`Descargando ${img.name}... `);
    try {
      await download(img.url, filePath);
      console.log("✓");
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
  console.log("\n¡Proceso completado en public/images/courses/!");
}

main().catch(console.error);
