import { App, Modal, Notice, Setting, TFile, TFolder } from "obsidian";
import { CODE_FOLDER_NAME } from "./settings";

//──────────────────────────────────────────────────────────────────────────────

/** Prompts for name of new file, then runs callback on it. */
export function createCodeFile(app: App, callback: (codeFile: TFile) => void) {
	new InputModal(app, async (fullCode, codeDesc) => {
		// VALIDATE
		fullCode = fullCode
			.replace(/\.md$/, "") // no extension
			.replace(/[:#^?!"*<>|[\]\\]/g, "-") // no illegal characters
			.replace(/^\.|\/\./g, ""); // no hidden files/folders
		if (!fullCode) fullCode = "Unnamed Code";

		// GUARD
		const absolutePath = `${CODE_FOLDER_NAME}/${fullCode}.md`;
		const fileExists = app.vault.getAbstractFileByPath(absolutePath) instanceof TFile;
		if (fileExists) {
			new Notice(`Code "${fullCode}" already exists, aborting.`);
			return;
		}

		const parts = fullCode.split("/");
		const codeName = parts.pop();
		const codeSubfolder = parts.length ? "/" + parts.join("/") : "";

		const parent = CODE_FOLDER_NAME + codeSubfolder;
		const folderExists = app.vault.getAbstractFileByPath(parent) instanceof TFolder;
		if (!folderExists) await app.vault.createFolder(parent);

		codeDesc = codeDesc.replaceAll('"', "'"); // escape for YAML
		const descAsYamlFrontmatter = `---\ndescription: "${codeDesc}"\n---\n\n\n---\n`;
		const codeFile = await app.vault.create(`${parent}/${codeName}.md`, descAsYamlFrontmatter);
		callback(codeFile);

		new Notice(`Created new code file: "${fullCode}"`);
	}).open();
}

// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
class InputModal extends Modal {
	fullCode: string;
	codeDesc: string;
	onSubmit: (fullCode: string, codeDesc: string) => void;
	constructor(app: App, onSubmit: (fullCode: string, codeDesc: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}
	onOpen() {
		const { contentEl } = this;

		// info text
		contentEl.createEl("h4", { text: "New code creation" });
		contentEl.createEl("p", {
			text: 'Use a slash ("/") to create a subfolder for the code file (grouped code).',
		});

		// name input field
		new Setting(contentEl)
			.setName("Name")
			.setClass("quadro-code-creation-input")
			.addText((text) =>
				text.onChange((value) => {
					this.fullCode = value;
				}),
			);

		// description input field
		new Setting(contentEl)
			.setName("Description")
			.setClass("quadro-code-creation-input")
			.addText((text) =>
				text.onChange((value) => {
					this.codeDesc = value;
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
						this.onSubmit(this.fullCode, this.codeDesc);
					}),
			)
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
