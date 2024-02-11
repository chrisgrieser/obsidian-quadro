import { extractFromParagraph } from "./extract-from-paragraph";
import { aggregateExtractions } from "./aggregate-extractions";

export const EXTRACTION_COMMANDS = [
	{
		id: "extract-from-paragraph",
		name: "Extract from paragraph",
		func: extractFromParagraph,
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
