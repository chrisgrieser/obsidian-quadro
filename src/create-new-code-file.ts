import type { App, TFile } from "obsidian";
import { Modal, Notice, Setting, TFolder } from "obsidian";
import { CODE_FOLDER_NAME } from "./const";

//──────────────────────────────────────────────────────────────────────────────

/** Prompts for name of new file, then runs callback on it. */
export function createCodeFile(app: App, callback: (codeFile: TFile) => void) {
	new InputModal(app, async (input) => {
		const codeName = input.replace(/\.md$/, "").replace(/\\:/g, "-");
		const parts = codeName.split("/");
		const name = input ? parts.pop() : "Untitled Code";
		const codeSubfolder = input && parts.length ? "/" + parts.join("/") : "";

		const parent = CODE_FOLDER_NAME + codeSubfolder;
		const folderExists = app.vault.getAbstractFileByPath(parent) instanceof TFolder;
		if (!folderExists) await app.vault.createFolder(parent);

		const codeFile = await app.vault.create(`${parent}/${name}.md`, "\n\n");
		callback(codeFile);

		new Notice(`Created new code file: "${codeName}"`);
	}).open();
}

// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
class InputModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;
	constructor(app: App, onSubmit: (result: string) => void) {
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

		// input field
		new Setting(contentEl)
			.setName("Name of new code")
			.setClass("quadro-code-creation-input")
			.addText((text) =>
				text.onChange((value) => {
					this.result = value;
				}),
			);
		// submit & cancel button
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}),
			)
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
