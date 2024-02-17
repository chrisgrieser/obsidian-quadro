import { App, Modal, Notice, Setting, TFolder, normalizePath } from "obsidian";
import { EXTRACTION_FOLDER_NAME } from "src/settings";
import { moveCursorToFirstProperty, openFileInSplitToRight } from "src/utils";

class InputForNewExtractionType extends Modal {
	onSubmit: (nameOfNewType: string) => void;
	nameOfNewType = "";

	constructor(app: App, onSubmit: (nameOfNewType: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	override onOpen() {
		const { contentEl } = this;
		contentEl.addClass("quadro");
		contentEl.createEl("h4", { text: "New Extraction Type" });

		// name input field
		new Setting(contentEl).setName("Name of the new type").addText((text) =>
			text.onChange((value) => {
				this.nameOfNewType = value;
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
						this.onSubmit(this.nameOfNewType);
					}),
			)
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export function bootstrapExtractionTypeFolder(app: App) {
	new InputForNewExtractionType(app, async (nameOfNewType) => {
		const folderPath = normalizePath(
			EXTRACTION_FOLDER_NAME + "/" + nameOfNewType.replace(/[/\\:]/g, "-"),
		);
		const newExtractionType: TFolder = await app.vault.createFolder(folderPath);
		if (!(newExtractionType instanceof TFolder)) {
			new Notice("ERROR: Could not create Extraction Type Folder.", 3000);
			return;
		}
		bootstrapExtractionTemplate(app, nameOfNewType);
	}).open();
}

export async function bootstrapExtractionTemplate(app: App, newExtractionTypeName: string) {
	new Notice(`Creating New Template for Extraction Type "${newExtractionTypeName}"`, 6000);

	const templatePath = normalizePath(
		`${EXTRACTION_FOLDER_NAME}/${newExtractionTypeName}/Template.md`,
	);
	const templateForTemplate = "---\ndimension: \n---\n\n";
	const templateFile = await app.vault.create(templatePath, templateForTemplate);

	await openFileInSplitToRight(app, templateFile);
	moveCursorToFirstProperty("key");
}

export function createNewExtractionTypeCommand(app: App) {
	bootstrapExtractionTypeFolder(app);
}
