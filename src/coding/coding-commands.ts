import type { IconName } from "obsidian";
import type Quadro from "src/main";
import { assignCodeCommand } from "./assign-code.ts";
import { codeOverviewCommand } from "./code-overview.ts";
import { bulkCreateCodeFilesCommand } from "./create-new-code-file.ts";
import { deleteCodeEverywhereCommand } from "./delete-code-everywhere.ts";
import { mergeCodeFilesCommand } from "./merge-code-files.ts";
import { renameCodeCommand } from "./rename-code.ts";
import { unassignCodeCommand } from "./unassign-code.ts";

export interface CommandData {
	id: string;
	name: string;
	func: (plugin: Quadro) => void;
	hotkeyLetter?: string;
	icon: IconName;
}

// INFO Adding a few hotkey by default, since this plugin is going to be
// used by many people not familiar with Obsidian. Requiring them to
// add an hotkey would unnecessarily complicate the onboarding for
// them. We are, however, using combinations that are unlikely to
// conflict with other hotkeys.

export const CODING_COMMANDS: CommandData[] = [
	{
		id: "assign-code",
		name: "Assign code to paragraph",
		func: assignCodeCommand,
		hotkeyLetter: "a",
		icon: "circle-plus",
	},
	{
		id: "rename-code",
		name: "Rename code",
		func: renameCodeCommand,
		icon: "circle-slash",
	},
	{
		id: "unassign-code",
		name: "Remove code from paragraph",
		func: unassignCodeCommand,
		hotkeyLetter: "d",
		icon: "circle-minus",
	},
	{
		id: "delete-code-everywhere",
		name: "Delete Code File and all references to it",
		func: deleteCodeEverywhereCommand,
		icon: "circle-x",
	},
	{
		id: "merge-codes",
		name: "Merge another Code File into current Code File",
		func: mergeCodeFilesCommand,
		icon: "circle-dot",
	},
	{
		id: "bulk-create-new-code-files",
		name: "Bulk create new Code Files",
		func: bulkCreateCodeFilesCommand,
		icon: "circle-dashed",
	},
	{
		id: "code-overview-codeblock",
		name: "Show code overview",
		func: codeOverviewCommand,
		icon: "circle-equal",
	},
];
