import { App, ButtonComponent, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import Quadro from "src/main";

// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
class InputForOneFile extends Modal {
	fullCode = "";
	codeDesc = "";
	onSubmit: (fullCode: string, codeDesc: string) => void;
	confirmationButton: ButtonComponent | null = null;

	constructor(app: App, onSubmit: (fullCode: string, codeDesc: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.modalEl.addClass("quadro");
	}

	override onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h4", { text: "New code creation" });

		// name input field
		new Setting(contentEl)
			.setName("Name of the Code")
			.setDesc('Use a slash ("/") in the name to create the Code File in a subfolder (group).')
			.addText((text) =>
				text.onChange((value) => {
					this.fullCode = value.trim();
					this.confirmationButton?.setDisabled(this.fullCode === "");
				}),
			);

		// description input field
		new Setting(contentEl)
			.setName("Code Description")
			.setDesc('Will be added as metadata with the key "description".')
			.addText((text) =>
				text.onChange((value) => {
					this.codeDesc = value.trim();
				}),
			);

		// create & cancel button
		new Setting(contentEl)
			.addButton((btn) => {
				this.confirmationButton = btn
					.setButtonText("Create")
					.setCta()
					.setDisabled(true)
					.onClick(() => {
						this.close();
						this.onSubmit(this.fullCode, this.codeDesc);
					});
			})
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
	confirmationButton: ButtonComponent | null = null;

	constructor(app: App, onSubmit: (fullCode: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.modalEl.addClass("quadro");
	}

	override onOpen() {
		const { contentEl } = this;

		// info text
		contentEl.createEl("h4", { text: "Bulk-create new codes" });
		contentEl.createEl("p", { text: "Every line will result in a new code file." });
		contentEl.createEl("p", {
			text: 'Use a slash ("/") in the name to create the Code File in a subfolder (group).',
		});

		// textarea field
		new Setting(contentEl).setClass("quadro-bulk-code-creation").addTextArea((text) =>
			text.onChange((value) => {
				this.input = value.trim();
				this.confirmationButton?.setDisabled(this.input === "");
			}),
		);

		// create & cancel button
		new Setting(contentEl)
			.addButton((btn) => {
				this.confirmationButton = btn
					.setButtonText("Create")
					.setCta()
					.setDisabled(true)
					.onClick(() => {
						this.close();
						this.onSubmit(this.input);
					});
			})
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

//──────────────────────────────────────────────────────────────────────────────

async function createCodeFile(
	plugin: Quadro,
	fullCode: string,
	codeDesc: string,
): Promise<TFile | false> {
	const { app, settings } = plugin;
	fullCode = fullCode
		.replace(/\.md$/, "") // no extension
		.replace(/[:#^?!"*<>|[\]\\]/g, "-") // no illegal characters
		.replace(/^\.|\/\./g, ""); // no hidden files/folders

	// GUARD
	const absolutePath = normalizePath(`${settings.coding.folder}/${fullCode}.md`);
	const fileExists = app.vault.getAbstractFileByPath(absolutePath) instanceof TFile;
	if (fileExists) {
		new Notice(`Code "${fullCode}" already exists, Code File not created.`);
		return false;
	}

	const parts = fullCode.split("/");
	const codeName = parts.pop();
	const codeSubfolder = parts.length ? "/" + parts.join("/") : "";

	const parent = settings.coding.folder + codeSubfolder;
	const folderExists = app.vault.getFolderByPath(parent);
	if (!folderExists) await app.vault.createFolder(parent);

	codeDesc = codeDesc.replaceAll('"', "'"); // escape for YAML
	const descAsYamlFrontmatter = `---\ndescription: "${codeDesc}"\n---\n\n\n---\n\n`;

	const newCodeFile = await app.vault.create(`${parent}/${codeName}.md`, descAsYamlFrontmatter);
	return newCodeFile;
}

/** Prompts for name of new file, then runs callback on it. */
export function createOneCodeFile(plugin: Quadro, callback: (codeFile: TFile) => void): void {
	new InputForOneFile(plugin.app, async (fullCode, codeDesc) => {
		const codeFile = await createCodeFile(plugin, fullCode, codeDesc);
		if (codeFile) {
			new Notice(`Created new code file: "${fullCode}"`);
			callback(codeFile);
		} else {
			new Notice("File creation failed.");
		}
	}).open();
}

export async function bulkCreateCodeFilesCommand(plugin: Quadro): Promise<void> {
	new InputForMultipleFiles(plugin.app, async (userInput) => {
		let newFiles = 0;
		const failedFiles: string[] = [];
		for (const fullCode of userInput.split("\n")) {
			const newFile = await createCodeFile(plugin, fullCode, "");
			if (newFile) newFiles++;
			else failedFiles.push(fullCode);
		}

		// report
		let msg = `${newFiles} file(s) created`;
		if (failedFiles.length > 0) msg += "\nCould not create: " + failedFiles.join(", ");
		new Notice(msg, (failedFiles.length + 2) * 1000);
	}).open();
}
