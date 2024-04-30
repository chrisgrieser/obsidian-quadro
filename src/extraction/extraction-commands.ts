import { CommandData } from "src/coding/coding-commands";
import { addToLastExtractionFileCommand } from "./add-to-last-extraction-file";
import { aggregateExtractionsCommand } from "./aggregate-extractions";
import { createNewExtractionTypeCommand } from "./create-new-extraction-type";
import { exportExtractionsAsCsv } from "./export-extractions-as-csv";
import { extractFromParagraphCommand } from "./extract-from-paragraph";
import { extractiontypesOverviewCommand } from "./extractiontypes-overview";
import { mergeExtractionFilesCommand } from "./merge-extractions";

export const EXTRACTION_COMMANDS: CommandData[] = [
	{
		id: "extract-from-paragraph",
		name: "Extract from paragraph",
		func: extractFromParagraphCommand,
		hotkeyLetter: "e",
		ribbonIcon: "plus-square",
	},
	{
		id: "extract-to-last-extraction-file",
		name: "Add paragraph to last Extraction File",
		func: addToLastExtractionFileCommand,
		hotkeyLetter: "l",
		ribbonIcon: "square-asterisk",
	},
	{
		id: "merge-extractions",
		name: "Merge current Extraction File into another Extraction File",
		func: mergeExtractionFilesCommand,
		ribbonIcon: "square-dot",
	},
	{
		id: "aggregate-extractions",
		name: "Aggregate extractions",
		func: aggregateExtractionsCommand,
		ribbonIcon: "sigma-square",
	},
	{
		id: "create-new-extraction-type",
		name: "Create new Extraction Type",
		func: createNewExtractionTypeCommand,
		ribbonIcon: "box-select",
	},
	{
		id: "export-all-extractions-as-csv",
		name: "Export all extractions as .csv",
		func: exportExtractionsAsCsv,
		ribbonIcon: "arrow-up-square",
	},
	{
		id: "extractiontypes-overview",
		name: "Create/Goto extraction type overview file",
		func: extractiontypesOverviewCommand,
		ribbonIcon: "square-equal",
	},
];
