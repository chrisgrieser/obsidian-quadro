import { assignCodeCommand } from "./assign-code";
import { bulkCreateCodeFilesCommand } from "./create-new-code-file";
import { deleteCodeEverywhereCommand, unassignCodeCommand } from "./unassign-code";
import { mergeCodesCommand, renameCodeCommand } from "./wrapper-funcs";

export const CODING_COMMANDS = [
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
		name: "Delete code from paragraph",
		func: unassignCodeCommand,
		hotkeyLetter: "d",
		icon: "minus-circle",
	},
	{
		id: "delete-code-everywhere",
		name: "Delete code file and all references to it",
		func: deleteCodeEverywhereCommand,
		icon: "x-circle",
	},
	{
		id: "merge-codes",
		name: "Merge codes",
		func: mergeCodesCommand,
		icon: "radius",
	},
	{
		id: "bulk-create-new-code-files",
		name: "Bulk create new code files",
		func: bulkCreateCodeFilesCommand,
		icon: "circle-dot",
	},
];
