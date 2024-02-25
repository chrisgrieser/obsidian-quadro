// INFO
// - uppercase key are placeholders.
// - To function as a file for DataLoom, the object needs to be saved as JSON
//   with the file ending `.loom`.
//──────────────────────────────────────────────────────────────────────────────

const pluginVer = "8.15.12";
const columnWidth = "200px";

export interface LoomColumn extends Omit<typeof LOOM_COLUMN_TEMPLATE, "frontmatterKey"> {
	frontmatterKey: string | null;
}

export type Loom = typeof TEMPLATE_LOOM & {
	model: {
		columns: LoomColumn[];
	};
};

//──────────────────────────────────────────────────────────────────────────────

export const TEMPLATE_LOOM = {
	pluginVersion: pluginVer,
	model: {
		columns: [
			{
				id: "UUID",
				width: "50px",
				content: "Source",
				sortDir: "default",
				isVisible: false,
				type: "source",
				numberPrefix: "",
				numberSuffix: "",
				numberSeparator: "",
				numberFormat: "number",
				currencyType: "USD",
				dateFormat: "mmddyyyy",
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
				width: "40px",
				content: "Extraction File",
				sortDir: "default",
				isVisible: true,
				type: "source-file",
				numberPrefix: "",
				numberSuffix: "",
				numberSeparator: "",
				numberFormat: "number",
				currencyType: "USD",
				dateFormat: "mmddyyyy",
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
	sortDir: "default",
	isVisible: true,
	width: columnWidth,
	numberPrefix: "",
	numberSuffix: "",
	numberSeparator: "",
	content: "",
	numberFormat: "number",
	currencyType: "USD",
	dateFormat: "mmddyyyy",
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
