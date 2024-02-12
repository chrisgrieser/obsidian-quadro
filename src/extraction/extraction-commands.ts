import { aggregateExtractions } from "./aggregate-extractions";
import { extractFromParagraph } from "./extract-from-paragraph";

//──────────────────────────────────────────────────────────────────────────────
// INFO Adding a hotkey by default, since this plugin is going to be
// used by many people not familiar with Obsidian. Requiring them to
// add an hotkey would unnecessarily complicate the onboarding for
// them. We are, however, using combinations that are unlikely to
// conflict with other plugins with other hotkeys.

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
