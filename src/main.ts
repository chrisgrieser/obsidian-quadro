import { Plugin } from "obsidian";
import type { Editor } from "obsidian";
import { SuggesterForAddingQdaCode } from "./add-qda-code";

//──────────────────────────────────────────────────────────────────────────────

export default class QualitativeDataAnalysis extends Plugin {
	async onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		this.addCommand({
			id: "add-code",
			name: "Add Code",
			editorCallback: (editor: Editor) => {
				const suggester = new SuggesterForAddingQdaCode(this.app, editor)
				suggester.setPlaceholder("Select Code")
				suggester.open();
			},
		});
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
