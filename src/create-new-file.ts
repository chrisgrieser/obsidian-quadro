import type { App, TFile } from "obsidian";
import { Modal, Notice, Setting } from "obsidian";
import { CODE_FOLDER_NAME } from "./const";

//──────────────────────────────────────────────────────────────────────────────

/** Prompts for name of new file, then runs callback on it. */
export function createCodeFile(callback: (codeFile: TFile) => void) {
	new InputModal(this.app, async (input) => {
		const codeName = input.replace(/\.md$/, "").replace(/\\:/g, "-");
		const parts = codeName.split("/");
		const name = input ? parts.pop() : "Untitled Code";
		const subfolder = input && parts.length ? "/" + parts.join("/") : "";

		const folder = CODE_FOLDER_NAME + subfolder;
		if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);

		const codeFile = await this.app.vault.create(`${folder}/${name}.md`, "");
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
		contentEl.createEl("h3", { text: "Create new code" });
		new Setting(contentEl).setName("Name").addText((text) =>
			text.onChange((value) => {
				this.result = value;
			}),
		);
		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.result);
				}),
		);
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
