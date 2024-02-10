import { Command, Plugin } from "obsidian";
import { assignCode } from "./assign-code";
import { deleteCodeEverywhere, unassignCode } from "./unassign-code";
import { mergeCodes, renameCode } from "./wrapper-funcs";
import { bulkCreateCodeFiles } from "./create-new-code-file";

export default class Quadro extends Plugin {
	override onload() {
		// INFO Adding a hotkey by default, since this plugin is going to be
		// used by many people not familiar with Obsidian. Requiring them to
		// add an hotkey would unnecessarily complicate the onboarding for
		// them. We are, however, using combinations that are unlikely to
		// conflict with other plugins with other hotkeys.
		const commands = [
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
				icon: "pen-line",
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
				icon: "file-minus",
			},
			{
				id: "merge-codes",
				name: "Merge codes",
				func: mergeCodes,
				icon: "merge",
			},
			{
				id: "bulk-create-new-code-files",
				name: "Bulk create new code files",
				func: bulkCreateCodeFiles,
				icon: "copy-plus",
			},
		];

		for (const cmd of commands) {
			this.addRibbonIcon(cmd.icon, `Quadro: ${cmd.name}`, () => cmd.func(this.app));
			const cmdObj: Command = {
				id: cmd.id,
				name: cmd.name,
				editorCallback: () => cmd.func(this.app),
			};
			if (cmd.hotkeyLetter) {
				cmdObj.hotkeys = [{ modifiers: ["Mod", "Shift"], key: cmd.hotkeyLetter }];
			}
			this.addCommand(cmdObj);
		}

		console.info(this.manifest.name + " Plugin loaded.");
	}

	override onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
