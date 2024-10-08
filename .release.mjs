import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import readlinePromises from "node:readline/promises";

/** @param {string} filepath */
function readJson(filepath) {
	return JSON.parse(readFileSync(filepath, "utf8"));
}

/** @param {string} filepath @param {object} jsonObj */
function writeJson(filepath, jsonObj) {
	writeFileSync(filepath, JSON.stringify(jsonObj, null, "\t") + "\n");
}

//──────────────────────────────────────────────────────────────────────────────
// PROMPT FOR TARGET VERSION

const manifest = readJson("manifest.json");
const currentVersion = manifest.version;
const rl = readlinePromises.createInterface({ input: process.stdin, output: process.stdout });

console.info(`current version: ${currentVersion}`);
const nextVersion = await rl.question("   next version: ");
console.info("───────────────────────────");
if (!nextVersion?.match(/\d+\.\d+\.\d+/) || nextVersion === currentVersion) {
	console.error("\x1b[1;31mInvalid target version given, aborting.\x1b[0m");
	process.exit(1);
}

rl.close();

//──────────────────────────────────────────────────────────────────────────────
// UPDATE VERSION IN VARIOUS JSONS

manifest.version = nextVersion;
writeJson("manifest.json", manifest);

const versionsJson = readJson("versions.json");
versionsJson[nextVersion] = manifest.minAppVersion;
writeJson("versions.json", versionsJson);

const packageJson = readJson("package.json");
packageJson.version = nextVersion;
writeJson("package.json", packageJson);

const packageLock = readJson("package-lock.json");
packageLock.version = nextVersion;
packageLock.packages[""].version = nextVersion;
writeJson("package-lock.json", packageLock);

//──────────────────────────────────────────────────────────────────────────────
// UPDATE GIT REPO

const gitCommands = [
	"git add manifest.json versions.json package.json package-lock.json",
	`git commit --no-verify --message="release: ${nextVersion}"`, // skip hook, since only bumping
	"git pull --no-progress",
	"git push --no-progress",
	`git tag ${nextVersion}`, // tag triggers the release action
	"git push --no-progress origin --tags",
];

// INFO as opposed to `exec`, `spawn` does not buffer the output
const gitProcess = spawn(gitCommands.join(" && "), [], { shell: true });
gitProcess.stdout.on("data", (data) => console.info(data.toString().trim()));
gitProcess.stderr.on("data", (data) => console.info(data.toString().trim()));
gitProcess.on("error", (_err) => process.exit(1));
