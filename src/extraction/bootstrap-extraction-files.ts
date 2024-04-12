import { Notice, Setting, TFolder, normalizePath } from "obsidian";
import Quadro from "src/main";
import { ExtendedInputModal } from "src/shared/modals";
import { moveCursorToFirstProperty, openExtractionInNewWin } from "./extraction-utils";

class InputForNewExtractionType extends ExtendedInputModal {
	onSubmit: (nameOfNewType: string) => void;
	nameOfNewType = "";

	constructor(plugin: Quadro, onSubmit: (nameOfNewType: string) => void) {
		super(plugin);
		this.onSubmit = onSubmit;
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
}

export function bootstrapExtractionTypeFolder(plugin: Quadro) {
	const { app, settings } = plugin;

	new InputForNewExtractionType(plugin, async (nameOfNewType) => {
		nameOfNewType = nameOfNewType
			.replace(/\.md$/, "") // no extension, in case user misunderstood
			.replaceAll("/", "_") // no groups allowed for extraction types
			.replace(/[:#^?!"*<>|[\]\\]/g, "-") // no illegal characters
			.replace(/^\./, ""); // no hidden files/folders

		const folderPath = normalizePath(settings.extraction.folder + "/" + nameOfNewType);
		const newExtractionType: TFolder = await app.vault.createFolder(folderPath);
		if (!(newExtractionType instanceof TFolder)) {
			new Notice("ERROR: Could not create Extraction Type Folder.", 3000);
			return;
		}
		bootstrapExtractionTemplate(plugin, nameOfNewType);
	}).open();
}

export async function bootstrapExtractionTemplate(plugin: Quadro, newExtractionTypeName: string) {
	const { app, settings } = plugin;
	new Notice(`Creating New Template for Extraction Type "${newExtractionTypeName}"`, 6000);

	const templatePath = normalizePath(
		`${settings.extraction.folder}/${newExtractionTypeName}/Template.md`,
	);
	const templateForTemplate = "---\ndimension: \n---\n\n";

	// DataLoom has a BUG where multitext-properties with spaces do not work
	// https://github.com/trey-wallis/obsidian-dataloom/issues/932
	const dataloomBugInfo = [
		"> [!NOTE] ",
		'Due to a bug in DataLoom, properties of the type "List" must not have a space in them. You can work around that issue by using underscores or hyphens instead of a space.',
		"",
		"See <https://github.com/trey-wallis/obsidian-dataloom/issues/932>",
	].join("\n");

	const templateFile = await app.vault.create(templatePath, templateForTemplate + dataloomBugInfo);

	await openExtractionInNewWin(plugin, templateFile);
	app.commands.executeCommandById("file-explorer:reveal-active-file");
	moveCursorToFirstProperty(app, "key");
}

export function createNewExtractionTypeCommand(plugin: Quadro) {
	bootstrapExtractionTypeFolder(plugin);
}
