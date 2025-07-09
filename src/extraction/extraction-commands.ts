import type { CommandData } from "src/coding/coding-commands";
import { addToExistingExtractionFileCommand } from "./add-to-extraction-file.ts";
import { createNewExtractionTypeCommand } from "./create-new-extraction-type.ts";
import { exportExtractionsAsCsv } from "./export-extractions-as-csv.ts";
import { extractFromParagraphCommand } from "./extract-from-paragraph.ts";
import { extractiontypesOverviewCommand } from "./extractiontypes-overview.ts";
import { mergeExtractionFilesCommand } from "./merge-extractions.ts";

// INFO Adding a few hotkey by default, since this plugin is going to be
// used by many people not familiar with Obsidian. Requiring them to
// add an hotkey would unnecessarily complicate the onboarding for
// them. We are, however, using combinations that are unlikely to
// conflict with other hotkeys.

export const EXTRACTION_COMMANDS: CommandData[] = [
	{
		id: "extract-from-paragraph",
		name: "Extract from paragraph",
		func: extractFromParagraphCommand,
		hotkeyLetter: "e",
		icon: "square-plus",
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
		name: "Merge another Extraction File into current Extraction File",
		func: mergeExtractionFilesCommand,
		icon: "square-dot",
	},
	{
		id: "create-new-extraction-type",
		name: "Create new Extraction Type",
		func: createNewExtractionTypeCommand,
		icon: "box-select", // in lucid 0.447 renamed to `square-dashed`
	},
	{
		id: "export-all-extractions-as-csv",
		name: "Export all extractions as .csv",
		func: exportExtractionsAsCsv,
		icon: "square-arrow-up",
	},
	{
		id: "extractiontypes-overview",
		name: "Show extraction type overview",
		func: extractiontypesOverviewCommand,
		icon: "square-equal",
	},
];
