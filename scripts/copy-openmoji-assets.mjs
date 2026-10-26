import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve("node_modules/openmoji");
const publicRoot = resolve("public/openmoji");

await mkdir(publicRoot, { recursive: true });

for (const style of ["black", "color"]) {
  const source = resolve(packageRoot, style);
  const destination = resolve(publicRoot, style);
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
}

console.log("OpenMoji SVG assets copied to public/openmoji.");
