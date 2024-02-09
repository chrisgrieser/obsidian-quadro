import type { TFile } from "obsidian";

//──────────────────────────────────────────────────────────────────────────────

export const CODE_FOLDER_NAME = "Codes";

export const MINIGRAPH = {
	char: "🬋",
	charsPerBlock: 100, // how many characters one block represents
	maxLength: 100,
};

export const TFILE_SORT_FUNC = {
	alphabeticalByCodeName: (a: TFile, b: TFile) => a.basename.localeCompare(b.basename),
	alphabeticalByFullCode: (a: TFile, b: TFile) => {
		const aFullCode = a.path.slice(CODE_FOLDER_NAME.length + 1);
		const bFullCode = b.path.slice(CODE_FOLDER_NAME.length + 1);
		return aFullCode.localeCompare(bFullCode);
	},
	lastUsedFirst: (a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime,
	oldestUsedFirst: (a: TFile, b: TFile) => a.stat.mtime - b.stat.mtime,
	frequentlyUsedFirst: (a: TFile, b: TFile) => b.stat.size - a.stat.size,
	rarelyUsedFirst: (a: TFile, b: TFile) => a.stat.size - b.stat.size,
	randomOrder: () => Math.random() - 0.5,
};

export const ASSIGN_CODE_INITIAL_ORDER = "lastUsedFirst";

//──────────────────────────────────────────────────────────────────────────────

export const EXTRACTION_FOLDER_NAME = "Extractions";
