import { createWriteStream } from "node:fs";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dist = path.join(__dirname, "dist");
const outputPath = path.join(dist, "eam-ui.zip");

try {
    await unlink(outputPath);
} catch (error) {
    if (error.code !== "ENOENT") {
        throw error;
    }
}

const output = createWriteStream(outputPath);

const archive = new ZipArchive({
    zlib: {
        level: 9
    }
});

archive.pipe(output);

const files = await readdir(dist);

for (const file of files) {
    if (file === "eam-ui.zip") {
        continue;
    }

    const fullPath = path.join(dist, file);
    const fileStat = await stat(fullPath);

    if (fileStat.isDirectory()) {
        archive.directory(fullPath, file);
    } else {
        archive.file(fullPath, {
            name: file
        });
    }
}

await archive.finalize();

await new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
});

console.log(`Created: ${outputPath}`);
console.log(`Size: ${archive.pointer()} bytes`);