import { Notice, Setting, normalizePath } from "obsidian";
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

export function createNewExtractionTypeCommand(plugin: Quadro) {
	const { app, settings } = plugin;

	new InputForNewExtractionType(plugin, async (nameOfNewType) => {
		// CREATE NEW FOLDER
		nameOfNewType = nameOfNewType
			.replace(/\.md$/, "") // no extension, in case user misunderstood
			.replaceAll("/", "_") // no groups allowed for extraction types
			.replace(/[:#^?!"*<>|[\]\\]/g, "-") // no illegal characters
			.replace(/^\./, ""); // no hidden files/folders

		const folderPath = normalizePath(settings.extraction.folder + "/" + nameOfNewType);
		await app.vault.createFolder(folderPath);

		// CREATE NEW TEMPLATE
		new Notice(`Creating New Template for Extraction Type "${nameOfNewType}"`, 6000);

		const templateForTemplate = "---\ndimension: \n---\n\n";
		const dataloomBugInfo = [
			"> [!NOTE] ",
			'Due to a bug in DataLoom, properties of the type "List" must not have a space in them. You can work around that issue by using underscores or hyphens instead of a space.',
			"",
			"See <https://github.com/trey-wallis/obsidian-dataloom/issues/932>",
		].join("\n");

		const templateFile = await app.vault.create(
			folderPath + "/Template.md",
			templateForTemplate + dataloomBugInfo,
		);

		await openExtractionInNewWin(plugin, templateFile);
		app.commands.executeCommandById("file-explorer:reveal-active-file");
		moveCursorToFirstProperty(app, "key");
	}).open();
}
