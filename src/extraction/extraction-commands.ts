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
		icon: "plus-square",
	},
	{
		id: "extract-to-last-extraction-file",
		name: "Add paragraph to last Extraction File",
		func: addToLastExtractionFileCommand,
		hotkeyLetter: "l",
		icon: "square-asterisk",
	},
	{
		id: "merge-extractions",
		name: "Merge current Extraction File into another Extraction File",
		func: mergeExtractionFilesCommand,
		icon: "square-dot",
	},
	{
		id: "aggregate-extractions",
		name: "Aggregate extractions",
		func: aggregateExtractionsCommand,
		icon: "sigma-square",
	},
	{
		id: "create-new-extraction-type",
		name: "Create new Extraction Type",
		func: createNewExtractionTypeCommand,
		icon: "box-select",
	},
	{
		id: "export-all-extractions-as-csv",
		name: "Export all extractions as .csv",
		func: exportExtractionsAsCsv,
		icon: "arrow-up-square",
	},
	{
		id: "extractiontypes-overview",
		name: "Create/Goto extraction type overview file",
		func: extractiontypesOverviewCommand,
		icon: "square-equal",
	},
];
