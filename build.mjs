import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const source = process.cwd();
const output = join(source, "dist");
const files = ["index.html", "styles.css", "app.js"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((file) => cp(join(source, file), join(output, file))));

console.log(`Sitio estático generado en ${output}`);
