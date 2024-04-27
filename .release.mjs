import { exec } from "node:child_process";
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
console.info(`current version: ${currentVersion}`);
const rl = readlinePromises.createInterface({ input: process.stdin, output: process.stdout });
const nextVersion = await rl.question("   next version: ");
console.info("───────────────────────────");
rl.close();
if (!nextVersion?.match(/\d+\.\d+\.\d+/) || nextVersion === currentVersion) {
	console.error("\x1b[1;31mInvalid target version given, aborting.\x1b[0m");
	process.exit(1);
}

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
	`git commit -m "release: ${nextVersion}"`,
	"git pull",
	"git push",
	`git tag ${nextVersion}`, // tag triggers the release action
	"git push origin --tags",
];
exec(gitCommands.join(" && "), (err, stdout, stderr) => {
	if (err) console.error(err);
	if (stderr) console.info(stderr.trim()); // git posts some output to stderr without there being an error
	if (stdout) console.info(stdout.trim());
	process.exit(err ? 1 : 0);
});
