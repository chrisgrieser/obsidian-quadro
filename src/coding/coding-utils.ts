import { TFile } from "obsidian";
import Quadro from "src/main";

export function getFullCode(plugin: Quadro, tFile: TFile): string {
	return tFile.path.slice(plugin.settings.coding.folder.length + 1, -3);
}
