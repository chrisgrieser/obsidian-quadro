import { CommandData } from "src/coding/coding-commands";
import { addToExistingExtractionFileCommand } from "./add-to-extraction-file";
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
		id: "extract-existing-extraction-file",
		name: "Add paragraph as source to existing Extraction File",
		func: addToExistingExtractionFileCommand,
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
