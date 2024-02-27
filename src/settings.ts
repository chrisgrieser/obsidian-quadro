import { TFile } from "obsidian";

const tfileSortFuncs = {
	alphabeticalByCodeName: (a: TFile, b: TFile) => a.basename.localeCompare(b.basename),
	lastUsedFirst: (a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime,
	oldestUsedFirst: (a: TFile, b: TFile) => a.stat.mtime - b.stat.mtime,
	frequentlyUsedFirst: (a: TFile, b: TFile) => b.stat.size - a.stat.size,
	rarelyUsedFirst: (a: TFile, b: TFile) => a.stat.size - b.stat.size,
	randomOrder: () => Math.random() - 0.5,
};

export const DEFAULT_SETTINGS = {
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

export type QuadroSettings = typeof DEFAULT_SETTINGS;
