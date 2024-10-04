import { moment, normalizePath } from "obsidian";
import { CommandData } from "src/coding/coding-commands";
import Quadro from "src/main";

type ProgressForDay = {
	extraction?: Record<string, number>;
	coding?: Record<string, number>;
	other?: Record<string, number>;
};

type TotalProgress = Record<string, ProgressForDay>;

//──────────────────────────────────────────────────────────────────────────────

export const PROGRESS_COMMANDS: CommandData[] = [
	{
		id: "show-progress",
		name: "Show data analysis progress file",
		func: revealProgressFile,
		icon: "loader",
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

export async function incrementProgress(
	plugin: Quadro,
	group: "extraction" | "coding" | "other",
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
