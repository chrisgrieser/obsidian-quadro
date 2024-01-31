import { Plugin } from "obsidian";
import { SuggesterForAddingQdaCode } from "./add-qda-code";

//──────────────────────────────────────────────────────────────────────────────

export default class QualitativeDataAnalysis extends Plugin {
	async onload() {
		console.info(this.manifest.name + " Plugin loaded.");

		this.addCommand({
			id: "add-code",
			name: "Add Code",
			callback: () => {
				new SuggesterForAddingQdaCode(this.app).open();
			},
		});
	}

	onunload() {
		console.info(this.manifest.name + " Plugin unloaded.");
	}
}
