import { moment } from "obsidian";
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
		name: "Show data analayis progress file (WIP)",
		func: revealProgressFile,
		icon: "loader",
	},
];

//──────────────────────────────────────────────────────────────────────────────

function getProgressFilepath(plugin: Quadro): string {
	const storageLocation = `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}/`;
	const filename = "progress.json";
	return storageLocation + filename;
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

function revealProgressFile(plugin: Quadro): void {
	plugin.app.showInFolder(getProgressFilepath(plugin));
}
