import { App, ButtonComponent, Modal, Notice, Setting, TFolder, normalizePath } from "obsidian";
import { EXTRACTION_FOLDER_NAME } from "src/settings";
import { moveCursorToFirstProperty, openFileInSplitToRight } from "src/utils";

class InputForNewExtractionType extends Modal {
	onSubmit: (nameOfNewType: string) => void;
	nameOfNewType = "";
	confirmationButton: ButtonComponent | null = null;

	constructor(app: App, onSubmit: (nameOfNewType: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.modalEl.addClass("quadro");
	}

	override onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h4", { text: "New Extraction Type" });

		// name input field
		new Setting(contentEl).setName("Name of the new type").addText((text) =>
			text.onChange((value) => {
				this.nameOfNewType = value.trim();
				this.confirmationButton?.setDisabled(this.nameOfNewType === "");
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
						this.onSubmit(this.nameOfNewType);
					});
			})
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export function bootstrapExtractionTypeFolder(app: App) {
	new InputForNewExtractionType(app, async (nameOfNewType) => {
		// VALIDATE
		nameOfNewType = nameOfNewType
			.replace(/\.md$/, "") // no extension, in case user misunderstood
			.replaceAll("/", "_") // no groups allowed for extraction types
			.replace(/[:#^?!"*<>|[\]\\]/g, "-") // no illegal characters
			.replace(/^\./, ""); // no hidden files/folders

		const folderPath = normalizePath(EXTRACTION_FOLDER_NAME + "/" + nameOfNewType);
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

	// DataLoom has a BUG where multitext-properties with spaces do not work
	// https://github.com/trey-wallis/obsidian-dataloom/issues/932
	const dataloomBugInfo = [
		"> [!NOTE] ",
		'Due to a bug in DataLoom, properties of the type "List" must not have a space in them. You can work around that issue by using underscros or hyphens instead of a space.',
		"See <https://github.com/trey-wallis/obsidian-dataloom/issues/932>",
	].join("\n");

	const templateFile = await app.vault.create(templatePath, templateForTemplate + dataloomBugInfo);

	await openFileInSplitToRight(app, templateFile);
	app.commands.executeCommandById("file-explorer:reveal-active-file");
	moveCursorToFirstProperty("key");
}

export function createNewExtractionTypeCommand(app: App) {
	bootstrapExtractionTypeFolder(app);
}
