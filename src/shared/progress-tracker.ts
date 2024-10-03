import { moment } from "obsidian";
import Quadro from "src/main";

const PROGRESS_FILE = "progress.json";

type ProgressForDay = {
	extraction?: Record<string, number>;
	coding?: Record<string, number>;
	other?: Record<string, number>;
};

type TotalProgress = Record<string, ProgressForDay>;

//──────────────────────────────────────────────────────────────────────────────

export async function incrementProgress(
	plugin: Quadro,
	group: "extraction" | "coding" | "other",
	action: string,
): Promise<void> {
	const { app } = plugin;
	const storageLocation = `${app.vault.configDir}/plugins/${plugin.manifest.id}/`;
	const progressFilepath = storageLocation + PROGRESS_FILE;
	const datestamp = moment().format("YYYY-MM-DD");

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
