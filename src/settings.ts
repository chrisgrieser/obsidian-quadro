import { TFile } from "obsidian";

const tfileSortFuncs = {
	alphabeticalByCodeName: (a: TFile, b: TFile) => a.basename.localeCompare(b.basename),
	alphabeticalByFullCode: (a: TFile, b: TFile) => {
		const aFullCode = a.path.slice(SETTINGS.coding.folder.length + 1);
		const bFullCode = b.path.slice(SETTINGS.coding.folder.length + 1);
		return aFullCode.localeCompare(bFullCode);
	},
	lastUsedFirst: (a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime,
	oldestUsedFirst: (a: TFile, b: TFile) => a.stat.mtime - b.stat.mtime,
	frequentlyUsedFirst: (a: TFile, b: TFile) => b.stat.size - a.stat.size,
	rarelyUsedFirst: (a: TFile, b: TFile) => a.stat.size - b.stat.size,
	randomOrder: () => Math.random() - 0.5,
};

export const SORT_FUNC_TO_USE = tfileSortFuncs.lastUsedFirst;

const defaultSettings = {
	coding: {
		folder: "Codes",
		sortFunc: tfileSortFuncs.lastUsedFirst,
		minigraph: {
			enable: true,
			char: "🬋",
			charsPerBlock: 100, // how many characters one block represents
			maxLength: 100,
		},
	},
	extraction: {
		folder: "Extractions",
		csvSeparator: ",",
	},
	analysis: {
		folder: "Analysis",
	},
};

export type QuadroSettings = typeof defaultSettings;

export const SETTINGS: QuadroSettings = Object.assign({}, defaultSettings);
