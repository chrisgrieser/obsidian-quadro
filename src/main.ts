import { Notice, Plugin } from "obsidian";
import type { Editor } from "obsidian";
import { SuggesterForCodeAssignment } from "./assign-code";
import { CODE_FOLDER_NAME } from "./const";

//──────────────────────────────────────────────────────────────────────────────

export default class Quadro extends Plugin {
	async onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		this.addCommand({
			id: "assign-code-to-paragraph",
			name: "Assign code to paragraph",
			editorCallback: (editor: Editor) => {
				const currentFilePath = editor.editorComponent.view.file.path;
				const isInCodeFolder = currentFilePath.startsWith(CODE_FOLDER_NAME + "/");
				if (isInCodeFolder) {
					new Notice("You cannot assign a code to a code file.");
					return;
				}
				new SuggesterForCodeAssignment(this.app, editor).open();
			},
			// INFO Adding a hotkey by default, since this plugin is going to be
			// used by many people not familiar with Obsidian. Requiring them to
			// add an hotkey would unnecessarily complicate the onboarding for
			// them. Using `alt+c` as a combination, as it is unlikely to conflict
			// with other hotkeys.
			hotkeys: [{ modifiers: ["Alt"], key: "c" }],
		});
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
