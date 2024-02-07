import type { App, TFile } from "obsidian";
import { Modal, Notice, Setting } from "obsidian";
import { CODE_FOLDER_NAME } from "./const";

//──────────────────────────────────────────────────────────────────────────────

/** Prompts for name of new file, then runs callback on it. */
export function createFile(prompt: string, callback: (codeFile: TFile) => void) {
	new InputModal(this.app, prompt, async (input) => {
		const codeName = input.replace(/\.md$/, "").replace(/\\:/g, "-");
		const parts = codeName.split("/");
		const name = parts.pop() || "Untitled Code";
		const subfolder = parts.length ? "/" + parts.join("/") : "";

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
	prompt: string;
	constructor(app: App, prompt: string, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.prompt = prompt;
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: this.prompt });
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
