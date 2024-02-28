import { TFile } from "obsidian";

export const sortFuncs = {
	"last used first": (a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime,
	"oldest used first": (a: TFile, b: TFile) => a.stat.mtime - b.stat.mtime,
	"frequently used first": (a: TFile, b: TFile) => b.stat.size - a.stat.size,
	"rarely used first": (a: TFile, b: TFile) => a.stat.size - b.stat.size,
	random: () => Math.random() - 0.5,
	alphabetical: (a: TFile, b: TFile) => a.basename.localeCompare(b.basename),
};
export type SortFuncChoices = keyof typeof sortFuncs;

export const csvSeparators = {
	",": "Comma (,)",
	";": "Semicolon (;)",
	"\t": "Tab",
};
export type CsvSeparatorChoices = keyof typeof csvSeparators;

export const DEFAULT_SETTINGS = {
	coding: {
		folder: "Codes",
		sortFunc: "last used first" as SortFuncChoices,
		minigraph: {
			enabled: true,
			char: "🬋",
			charsPerBlock: 100, // how many characters one block represents
			maxLength: 100,
		},
	},
	extraction: {
		folder: "Extractions",
		csvSeparator: "," as CsvSeparatorChoices,
		countForExtractionType: {
			enabled: true,
		},
	},
	analysis: {
		folder: "Analysis",
	},
};

export type QuadroSettings = typeof DEFAULT_SETTINGS;
