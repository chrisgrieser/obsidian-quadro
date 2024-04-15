import { CommandData } from "src/coding/coding-commands";
import { aggregateExtractionsCommand } from "./aggregate-extractions";
import { createNewExtractionTypeCommand } from "./create-new-extraction-type";
import { exportExtractionsAsCsv } from "./export-extractions-as-csv";
import { extractFromParagraphCommand } from "./extract-from-paragraph";
import { insertExtractiontypesOverviewCodeblockCommand } from "./extractiontypes-overview";

export const EXTRACTION_COMMANDS: CommandData[] = [
	{
		id: "extract-from-paragraph",
		name: "Extract from paragraph",
		func: extractFromParagraphCommand,
		hotkeyLetter: "e",
		ribbonIcon: "plus-square",
	},
	{
		id: "create-new-extraction-type",
		name: "Create new extraction type",
		func: createNewExtractionTypeCommand,
		ribbonIcon: "box-select",
	},
	{
		id: "aggregate-extractions",
		name: "Aggregate extractions",
		func: aggregateExtractionsCommand,
		ribbonIcon: "sigma-square",
	},
	{
		id: "export-all-extractions-as-csv",
		name: "Export all extractions as .csv",
		func: exportExtractionsAsCsv,
		ribbonIcon: "arrow-up-square",
	},
	{
		id: "insert-extractiontypes-overview-codeblock",
		name: "Insert overview of extraction types at cursor",
		func: insertExtractiontypesOverviewCodeblockCommand,
		ribbonIcon: "square-equal",
	},
];
