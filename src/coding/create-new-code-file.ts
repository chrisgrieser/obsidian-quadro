import { App, Modal, Notice, Setting, TFile, TFolder, normalizePath } from "obsidian";
import { CODE_FOLDER_NAME } from "src/settings";
//──────────────────────────────────────────────────────────────────────────────

// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
class InputForOneFile extends Modal {
	fullCode = "";
	codeDesc = "";
	onSubmit: (fullCode: string, codeDesc: string) => void;
	constructor(app: App, onSubmit: (fullCode: string, codeDesc: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}
	override onOpen() {
		const { contentEl } = this;
		contentEl.addClass("quadro")

		// info text
		contentEl.createEl("h4", { text: "New code creation" });
		contentEl.createEl("p", {
			text: 'Use a slash ("/") in the name of the code to create the Code File in a subfolder.',
		});

		// name input field
		new Setting(contentEl)
			.setName("Code name")
			.addText((text) =>
				text.onChange((value) => {
					this.fullCode = value;
				}),
			);

		// description input field
		new Setting(contentEl)
			.setName("Description")
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
	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class InputForMultipleFiles extends Modal {
	input = "";
	onSubmit: (fullCode: string) => void;
	constructor(app: App, onSubmit: (fullCode: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}
	override onOpen() {
		const { contentEl } = this;
		contentEl.addClass("quadro")

		// info text
		contentEl.createEl("h4", { text: "Bulk-create new codes" });
		contentEl.createEl("p", { text: "Every line will result in a new code file." });
		contentEl.createEl("p", {
			text: 'Use a slash ("/") to create the Code File in a subfolder.',
		});

		// textarea field
		new Setting(contentEl)
			.setClass("quadro-bulk-code-creation")
			.addTextArea((text) =>
				text.onChange((value) => {
					this.input = value;
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
						this.onSubmit(this.input);
					}),
			)
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

//──────────────────────────────────────────────────────────────────────────────

async function createCodeFile(app: App, fullCode: string, codeDesc: string) {
	// VALIDATE
	fullCode = fullCode
		.replace(/\.md$/, "") // no extension
		.replace(/[:#^?!"*<>|[\]\\]/g, "-") // no illegal characters
		.replace(/^\.|\/\./g, ""); // no hidden files/folders
	if (!fullCode) fullCode = "Unnamed Code";

	// GUARD
	const absolutePath = normalizePath(`${CODE_FOLDER_NAME}/${fullCode}.md`);
	const fileExists = app.vault.getAbstractFileByPath(absolutePath) instanceof TFile;
	if (fileExists) {
		new Notice(`Code "${fullCode}" already exists, Code File not created.`);
		return undefined;
	}

	const parts = fullCode.split("/");
	const codeName = parts.pop();
	const codeSubfolder = parts.length ? "/" + parts.join("/") : "";

	const parent = CODE_FOLDER_NAME + codeSubfolder;
	const folderExists = app.vault.getAbstractFileByPath(parent) instanceof TFolder;
	if (!folderExists) await app.vault.createFolder(parent);

	codeDesc = codeDesc.replaceAll('"', "'"); // escape for YAML
	const descAsYamlFrontmatter = `---\ndescription: "${codeDesc}"\n---\n\n\n---\n\n`;

	const newCodeFile = await app.vault.create(`${parent}/${codeName}.md`, descAsYamlFrontmatter);
	return newCodeFile;
}

/** Prompts for name of new file, then runs callback on it. */
export function createOneCodeFile(app: App, callback: (codeFile: TFile) => void) {
	new InputForOneFile(app, async (fullCode, codeDesc) => {
		const codeFile = await createCodeFile(app, fullCode, codeDesc);
		if (codeFile) {
			new Notice(`Created new code file: "${fullCode}"`);
			callback(codeFile);
		} else {
			new Notice("File creation failed.");
		}
	}).open();
}

export async function bulkCreateCodeFiles(app: App) {
	// TEST-variable only
	// const userInput = "colors/red\ncolors/purple\nblubb/yellow";

	new InputForMultipleFiles(app, async (userInput) => {
		let newFiles = 0;
		const failedFiles: string[] = [];
		for (const fullCode of userInput.split("\n")) {
			const newFile = await createCodeFile(app, fullCode, "");
			if (newFile) newFiles++;
			else failedFiles.push(fullCode);
		}

		// report
		let msg = `${newFiles} file(s) created`;
		if (failedFiles.length > 0) msg += "\nCould not create: " + failedFiles.join(", ");
		new Notice(msg, (failedFiles.length + 2) * 1000);
	}).open();
}
