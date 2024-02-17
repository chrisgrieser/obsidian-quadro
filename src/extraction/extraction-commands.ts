import { aggregateExtractions } from "./aggregate-extractions";
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
		id: "aggregate-extractions",
		name: "Aggregate extractions",
		func: aggregateExtractions,
		icon: "gantt-chart-square",
	},
];
