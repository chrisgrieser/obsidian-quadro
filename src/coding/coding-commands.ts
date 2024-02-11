import { assignCode } from "./assign-code";
import { bulkCreateCodeFiles } from "./create-new-code-file";
import { unassignCode, deleteCodeEverywhere } from "./unassign-code";
import { renameCode, mergeCodes } from "./wrapper-funcs";

//──────────────────────────────────────────────────────────────────────────────

// INFO Adding a hotkey by default, since this plugin is going to be
// used by many people not familiar with Obsidian. Requiring them to
// add an hotkey would unnecessarily complicate the onboarding for
// them. We are, however, using combinations that are unlikely to

// conflict with other plugins with other hotkeys.
export const CODING_COMMANDS = [
	{
		id: "assign-code",
		name: "Assign code to paragraph",
		func: assignCode,
		hotkeyLetter: "a",
		icon: "plus-circle",
	},
	{
		id: "rename-code",
		name: "Rename code",
		func: renameCode,
		hotkeyLetter: "r",
		icon: "circle-slash",
	},
	{
		id: "unassign-code",
		name: "Delete code from paragraph",
		func: unassignCode,
		hotkeyLetter: "d",
		icon: "minus-circle",
	},
	{
		id: "delete-code-everywhere",
		name: "Delete code file and all references to it",
		func: deleteCodeEverywhere,
		icon: "x-circle",
	},
	{
		id: "merge-codes",
		name: "Merge codes",
		func: mergeCodes,
		icon: "radius",
	},
	{
		id: "bulk-create-new-code-files",
		name: "Bulk create new code files",
		func: bulkCreateCodeFiles,
		icon: "circle-dot",
	},
];
