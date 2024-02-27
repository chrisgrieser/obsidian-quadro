import { IconName } from "obsidian";
import Quadro from "src/main";
import { assignCodeCommand } from "./assign-code";
import { bulkCreateCodeFilesCommand } from "./create-new-code-file";
import { deleteCodeEverywhereCommand } from "./delete-code-everywhere";
import { renameCodeCommand } from "./rename-code";
import { unassignCodeCommand } from "./unassign-code";

export interface CommandData {
	id: string;
	name: string;
	func: (plugin: Quadro) => void;
	hotkeyLetter?: string;
	ribbonIcon: IconName;
}

export const CODING_COMMANDS: CommandData[] = [
	{
		id: "assign-code",
		name: "Assign code to paragraph",
		func: assignCodeCommand,
		hotkeyLetter: "a",
		ribbonIcon: "plus-circle",
	},
	{
		id: "rename-code",
		name: "Rename code",
		func: renameCodeCommand,
		hotkeyLetter: "r",
		ribbonIcon: "circle-slash",
	},
	{
		id: "unassign-code",
		name: "Delete code from paragraph",
		func: unassignCodeCommand,
		hotkeyLetter: "d",
		ribbonIcon: "minus-circle",
	},
	{
		id: "delete-code-everywhere",
		name: "Delete code file and all references to it",
		func: deleteCodeEverywhereCommand,
		ribbonIcon: "x-circle",
	},
	{
		id: "bulk-create-new-code-files",
		name: "Bulk create new code files",
		func: bulkCreateCodeFilesCommand,
		ribbonIcon: "circle-dashed",
	},
];
