import type { App, TFile } from "obsidian";
import { Modal, Notice, Setting, TFolder } from "obsidian";
import { CODE_FOLDER_NAME } from "./const";

//──────────────────────────────────────────────────────────────────────────────

/** Prompts for name of new file, then runs callback on it. */
export function createCodeFile(app: App, callback: (codeFile: TFile) => void) {
	new InputModal(app, async (input) => {
		const fullCode = input
			.replace(/\.md$/, "") // no extension
			.replace(/\\:/g, "-") // no illegal characters
			.replace(/^\.|\/\./g, ""); // no hidden files/folders
		if (!input) input = "Unnamed Code";

		const parts = fullCode.split("/");
		const codeName = parts.pop();
		const codeSubfolder = parts.length ? "/" + parts.join("/") : "";

		const parent = CODE_FOLDER_NAME + codeSubfolder;
		const folderExists = app.vault.getAbstractFileByPath(parent) instanceof TFolder;
		if (!folderExists) await app.vault.createFolder(parent);

		const codeFile = await app.vault.create(`${parent}/${codeName}.md`, "");
		callback(codeFile);

		new Notice(`Created new code file: "${fullCode}"`);
	}).open();
}

// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
class InputModal extends Modal {
	codeName: string;
	onSubmit: (codeName: string) => void;
	constructor(app: App, onSubmit: (codeName: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}
	onOpen() {
		const { contentEl } = this;

		// info text
		contentEl.createEl("h4", { text: "New code creation" });
		contentEl.createEl("p", {
			text: 'Use a "/" create a subfolder and place the code file there (grouped code).',
		});

		// name input field
		new Setting(contentEl)
			.setName("Name")
			.setClass("quadro-code-creation-input")
			.addText((text) =>
				text.onChange((value) => {
					this.codeName = value;
				}),
			);

		// create & cancel button
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Create")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.codeName);
					}),
			)
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
