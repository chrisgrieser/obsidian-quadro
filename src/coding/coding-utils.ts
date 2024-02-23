import { TFile } from "obsidian";
import { CODE_FOLDER_NAME } from "src/settings";

export function getFullCode(tFile: TFile): string {
	return tFile.path.slice(CODE_FOLDER_NAME.length + 1, -3);
}
