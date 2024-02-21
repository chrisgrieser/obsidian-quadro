import { aggregateExtractionsCommand } from "./aggregate-extractions";
import { createNewExtractionTypeCommand } from "./bootstrap-extraction-files";
import { extractFromParagraphCommand } from "./extract-from-paragraph";

export const EXTRACTION_COMMANDS = [
	{
		id: "extract-from-paragraph",
		name: "Extract from paragraph",
		func: extractFromParagraphCommand,
		hotkeyLetter: "e",
		icon: "plus-square",
	},
	{
		id: "create-new-extraction-type",
		name: "Create new extraction type",
		func: createNewExtractionTypeCommand,
		icon: "box-select",
	},
	{
		id: "aggregate-extractions",
		name: "Aggregate extractions",
		func: aggregateExtractionsCommand,
		icon: "sigma-square",
	},
];
