// DOCS `.loom` format: https://dataloom.xyz/other/loom-file
// TODO check out later if they have API available https://dataloom.xyz/integrations/api
//──────────────────────────────────────────────────────────────────────────────

// CONFIG default values
const dateFormat = "yyyymmdd"; // use ISO 8601

// FIX Diagnostics about `frontmatterKey` complaining about a string being assigned to `null`
export interface LoomColumn extends Omit<typeof LOOM_COLUMN_TEMPLATE, "frontmatterKey"> {
	frontmatterKey: string | null;
}
export type Loom = typeof TEMPLATE_LOOM & {
	model: {
		columns: LoomColumn[];
	};
};

export type LoomColumnType = "text" | "number" | "checkbox" | "multi-tag" | "date";

//──────────────────────────────────────────────────────────────────────────────

const pluginVer = "8.15.12";

// INFO uppercase key are placeholders, inserted via the aggregateExtractions cmd
export const TEMPLATE_LOOM = {
	pluginVersion: pluginVer,
	model: {
		columns: [
			{
				id: "UUID",
				width: "WIDTH",
				content: "Source",
				sortDir: "default",
				isVisible: false,
				type: "source",
				numberPrefix: "",
				numberSuffix: "",
				numberSeparator: "",
				numberFormat: "number",
				currencyType: "USD",
				dateFormat: dateFormat,
				dateFormatSeparator: "-",
				hour12: false,
				includeTime: false,
				shouldWrapOverflow: false,
				tags: [],
				calculationType: "none",
				aspectRatio: "unset",
				horizontalPadding: "unset",
				verticalPadding: "unset",
				frontmatterKey: null,
			},
			{
				id: "UUID",
				width: "WIDTH",
				content: "Extraction File",
				sortDir: "default",
				isVisible: true,
				type: "source-file",
				numberPrefix: "",
				numberSuffix: "",
				numberSeparator: "",
				numberFormat: "number",
				currencyType: "USD",
				dateFormat: dateFormat,
				dateFormatSeparator: "-",
				hour12: false,
				includeTime: false,
				shouldWrapOverflow: true,
				tags: [],
				calculationType: "count-all",
				aspectRatio: "unset",
				horizontalPadding: "unset",
				verticalPadding: "unset",
				frontmatterKey: null,
			},
		],
		rows: [],
		filters: [
			{
				id: "UUID",
				columnId: "UUID",
				operator: "or",
				isEnabled: true,
				type: "source-file",
				condition: "is-not",
				text: "Template",
			},
		],
		sources: [
			{
				id: "UUID",
				type: "folder",
				path: "PATH",
				includeSubfolders: false,
			},
		],
		settings: { numFrozenColumns: 1, showCalculationRow: false },
		externalRowOrder: [],
	},
};

export const LOOM_COLUMN_TEMPLATE = {
	id: "UUID",
	type: "LOOM_TYPE",
	frontmatterKey: "DIMENSION",
	width: "WIDTH",
	sortDir: "default",
	isVisible: true,
	numberPrefix: "",
	numberSuffix: "",
	numberSeparator: "",
	content: "",
	numberFormat: "number",
	currencyType: "USD",
	dateFormat: dateFormat,
	dateFormatSeparator: "-",
	hour12: false,
	includeTime: false,
	shouldWrapOverflow: true,
	tags: [],
	calculationType: "none",
	aspectRatio: "unset",
	horizontalPadding: "unset",
	verticalPadding: "unset",
};
