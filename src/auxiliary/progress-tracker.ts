import { Notice, TFile, moment, normalizePath } from "obsidian";
import { CommandData } from "src/coding/coding-commands";
import Quadro from "src/main";
import { typeOfFile } from "src/shared/utils";

type ProgressForDay = {
	"Code File"?: Record<string, number>;
	"Extraction File"?: Record<string, number>;
	"Data File"?: Record<string, number>;
};

type TotalProgress = Record<string, ProgressForDay>;

//──────────────────────────────────────────────────────────────────────────────

export const PROGRESS_COMMANDS: CommandData[] = [
	{
		id: "show-progress",
		name: "Show data analysis progress file",
		func: revealProgressFile,
		icon: "flag-triangle-right",
	},
	{
		id: "mark-datafile-as-read",
		name: "Mark current Data File as read",
		func: markDatafileAsRead,
		hotkeyLetter: "r",
		icon: "file-check",
	},
];

//──────────────────────────────────────────────────────────────────────────────

function getProgressFilepath(plugin: Quadro): string {
	const storageLocation = plugin.settings.analysis.folder;
	const filename = "progress.json";
	return normalizePath(storageLocation + "/" + filename);
}

function revealProgressFile(plugin: Quadro): void {
	plugin.app.showInFolder(getProgressFilepath(plugin));
}

function markDatafileAsRead(plugin: Quadro): void {
	const app = plugin.app;
	const currentFile = app.workspace.getActiveFile();

	// GUARD
	const isDataFile =
		typeOfFile(plugin, currentFile) === "Data File" && currentFile instanceof TFile;
	if (!isDataFile) {
		new Notice("Current file is not a Data File.", 4000);
		return;
	}
	const alreadyRead = app.metadataCache.getFileCache(currentFile)?.frontmatter?.read;
	if (alreadyRead) {
		new Notice("Data File already marked as read.", 4000);
		return;
	}

	app.fileManager.processFrontMatter(currentFile, (fm) => {
		fm.read = true;
	});
	incrementProgress(plugin, "Data File", "read");
	new Notice("Marked current Data File as read.");
}

export async function incrementProgress(
	plugin: Quadro,
	group: keyof ProgressForDay,
	action: string,
): Promise<void> {
	const { app } = plugin;
	const datestamp = moment().format("YYYY-MM-DD");
	const progressFilepath = getProgressFilepath(plugin);

	const fileExists = await app.vault.adapter.exists(progressFilepath);
	const progress: TotalProgress = fileExists
		? JSON.parse(await app.vault.adapter.read(progressFilepath))
		: {};

	if (!progress[datestamp]) progress[datestamp] = {};
	if (!progress[datestamp][group]) progress[datestamp][group] = {};
	if (!progress[datestamp][group][action]) progress[datestamp][group][action] = 0;
	progress[datestamp][group][action]++;

	app.vault.adapter.write(progressFilepath, JSON.stringify(progress, null, 2));
}
