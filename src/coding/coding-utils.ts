import { TFile } from "obsidian";
import { SETTINGS } from "src/settings";

export function getFullCode(tFile: TFile): string {
	return tFile.path.slice(SETTINGS.coding.folder.length + 1, -3);
}
