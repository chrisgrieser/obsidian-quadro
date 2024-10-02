import { IconName } from "obsidian";
import Quadro from "src/main";
import { assignCodeCommand } from "./assign-code";
import { codeOverviewCommand } from "./code-overview";
import { bulkCreateCodeFilesCommand } from "./create-new-code-file";
import { deleteCodeEverywhereCommand } from "./delete-code-everywhere";
import { mergeCodeFilesCommand } from "./merge-code-files";
import { renameCodeCommand } from "./rename-code";
import { unassignCodeCommand } from "./unassign-code";

export interface CommandData {
	id: string;
	name: string;
	func: (plugin: Quadro) => void;
	hotkeyLetter?: string;
	icon: IconName;
}

export const CODING_COMMANDS: CommandData[] = [
	{
		id: "assign-code",
		name: "Assign code to paragraph",
		func: assignCodeCommand,
		hotkeyLetter: "a",
		icon: "plus-circle",
	},
	{
		id: "rename-code",
		name: "Rename code",
		func: renameCodeCommand,
		hotkeyLetter: "r",
		icon: "circle-slash",
	},
	{
		id: "unassign-code",
		name: "Remove code from paragraph",
		func: unassignCodeCommand,
		hotkeyLetter: "d",
		icon: "minus-circle",
	},
	{
		id: "delete-code-everywhere",
		name: "Delete Code File and all references to it",
		func: deleteCodeEverywhereCommand,
		icon: "x-circle",
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
