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

//──────────────────────────────────────────────────────────────────────────────

// `Records` also used by dropdowns in the settings menu
export const csvSeparators = {
	",": "Comma (,)",
	";": "Semicolon (;)",
	"\t": "Tab",
};
export type CsvSeparatorChoices = keyof typeof csvSeparators;

export const openingModes = {
	"right-split": "to the right",
	"down-split": "to the bottom",
	tab: "in new tab",
};
export type OpeningModes = keyof typeof openingModes;

//──────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
	coding: {
		folder: "Codes",
		displayCount: true,
		sortFunc: "last used first" as SortFuncChoices,
	},
	extraction: {
		folder: "Extractions",
		displayCount: true,
		openingMode: "tab" as OpeningModes,
		csvSeparator: "," as CsvSeparatorChoices,
		ignorePropertyOnMerge: ["extraction-date"],
		displayProperty: [] as string[],
	},
	analysis: {
		folder: "Analysis",
	},
	suppressSuggestionInFields: [] as string[],
	propertiesKeysWidthPercent: 35,
};

export type QuadroSettings = typeof DEFAULT_SETTINGS;
