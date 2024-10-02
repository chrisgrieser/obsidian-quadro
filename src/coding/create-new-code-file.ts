import { Notice, Setting, TFile, getFrontMatterInfo, normalizePath } from "obsidian";
import Quadro from "src/main";
import { CodeGroupSuggest } from "src/shared/folder-suggest";
import { ExtendedInputModal } from "src/shared/modals";

// SOURCE https://docs.obsidian.md/Plugins/User+interface/Modals#Accept+user+input
class InputForOneFile extends ExtendedInputModal {
	fullCode = "";
	codeDesc = "";
	onSubmit: (fullCode: string, codeDesc: string) => void;

	constructor(plugin: Quadro, onSubmit: (fullCode: string, codeDesc: string) => void) {
		super(plugin);
		this.onSubmit = onSubmit;
	}

	override onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass(this.plugin.cssclass);

		const validCode = (fullCode: string): boolean =>
			fullCode !== "" && !fullCode.startsWith("/") && !fullCode.endsWith("/");

		const confirm = (): void => {
			this.close();
			this.onSubmit(this.fullCode, this.codeDesc);
		};

		// info text
		contentEl.createEl("h4", { text: "New code creation" });
		contentEl.createEl("small", {
			text: 'If there is a file "Template.md" at the root of the Codes Folder, the new Code File will be populated with its frontmatter.',
		});
		contentEl.createEl("br", {});
		contentEl.createEl("br", {});

		// name input field
		new Setting(contentEl)
			.setName("Name of the code")
			.setDesc(
				'Use a slash ("/") in the name to create the Code File in a subfolder (group). Example: "groupname/codename".',
			)
			.addText((text) => {
				new CodeGroupSuggest(this.plugin, text.inputEl);
				text
					.onChange((value) => {
						this.fullCode = value.trim();
						this.confirmationButton?.setDisabled(!validCode(this.fullCode));
					})
					.inputEl.addClass("quadro-wide-input");

				// press enter to confirm
				text.inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
					if (event.key === "Enter" && validCode(this.fullCode)) {
						event.preventDefault(); // https://discord.com/channels/686053708261228577/840286264964022302/1232354740629671967
						confirm();
					}
				});
			});

		// description input field
		new Setting(contentEl)
			.setName("Code description")
			.setDesc('Will be added as metadata with the key "code description".')
			.addText((text) => {
				text
					.onChange((value) => {
						this.codeDesc = value.trim();
					})
					.inputEl.addClass("quadro-wide-input");

				// press enter to confirm
				text.inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
					if (event.key === "Enter" && validCode(this.fullCode)) {
						event.preventDefault(); // https://discord.com/channels/686053708261228577/840286264964022302/1232354740629671967
						confirm();
					}
				});
			});

		// create & cancel button
		new Setting(contentEl)
			.addButton((btn) => {
				this.confirmationButton = btn
					.setButtonText("Create")
					.setCta()
					.setDisabled(true)
					.onClick(confirm);
			})
			.addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
	}
}

class InputForMultipleFiles extends ExtendedInputModal {
	input = "";
	onSubmit: (fullCode: string) => void;

	constructor(plugin: Quadro, onSubmit: (fullCode: string) => void) {
		super(plugin);
		this.onSubmit = onSubmit;
	}

	override onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass(this.plugin.cssclass);

		// info text
		contentEl.createEl("h4", { text: "Bulk-create new codes" });
		contentEl.createEl("p", { text: "Every line will result in a new code file." });
		contentEl.createEl("p", {
			text: 'Use a slash ("/") in the name to create the Code File in a subfolder (group).',
		});
		contentEl.createEl("p", {
			text: 'If there is a file "Template.md" at the root of the Codes Folder, the new Code Files will be populated with its frontmatter.',
		});

		// textarea field
		new Setting(contentEl)
			.addTextArea((textarea) => {
				textarea
					.onChange((value) => {
						this.input = value.trim();
						this.confirmationButton?.setDisabled(this.input === "");
					})
					.inputEl.addClass("quadro-large-textarea");
			})
			.infoEl.remove();

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
		.replace(/^\.|\/\./g, "") // no hidden files/folders
		.replace(/^\/+|\/+$/g, ""); // leading/trailing slashes

	// GUARD Code File already exists
	const absolutePath = normalizePath(`${settings.coding.folder}/${fullCode}.md`);
	const fileExists = app.vault.getFileByPath(absolutePath);
	if (fileExists) {
		new Notice(`Code "${fullCode}" already exists, Code File not created.`, 0);
		return false;
	}

	// create folder
	const parts = fullCode.split("/");
	const codeName = parts.pop();
	const codeSubfolder = parts.length > 0 ? "/" + parts.join("/") : "";
	const parent = settings.coding.folder + codeSubfolder;
	const folderExists = app.vault.getFolderByPath(parent);
	if (!folderExists) await app.vault.createFolder(parent);

	// CODE FILE content
	// read from template file, and if it has a description key, replace it there
	const descriptionLine = `code description: "${codeDesc.replaceAll('"', "'")}"`;

	const templateFile = app.vault.getFileByPath(settings.coding.folder + "/Template.md");
	const frontmatterLines: string[] = [];
	if (templateFile) {
		const codeDescRegex = /^code description: (.*)$/m;
		const templateContent = await app.vault.read(templateFile);
		let { exists, frontmatter: templateFrontmatter } = getFrontMatterInfo(templateContent);
		if (exists) {
			const templateHasDescriptionKey = templateFrontmatter.match(codeDescRegex);
			templateFrontmatter = templateHasDescriptionKey
				? templateFrontmatter.replace(codeDescRegex, descriptionLine)
				: descriptionLine + "\n" + templateFrontmatter;
			frontmatterLines.push(...templateFrontmatter.trim().split("\n"));
		}
	} else {
		frontmatterLines.push(descriptionLine);
	}

	const content = ["---", ...frontmatterLines, "---", "", ""];

	// create CODE FILE
	const newCodeFile = await app.vault.create(`${parent}/${codeName}.md`, content.join("\n"));
	if (!newCodeFile) {
		new Notice("Failed to create new code file.", 0);
		return false;
	}
	new Notice(`Created new code file: "${fullCode}"`, 3500);
	return newCodeFile;
}

/** Prompts for name of new file, then runs callback on it. */
export function createOneCodeFile(plugin: Quadro, callback: (codeFile: TFile) => void): void {
	new InputForOneFile(plugin, async (fullCode, codeDesc) => {
		const codeFile = await createCodeFile(plugin, fullCode, codeDesc);
		if (codeFile) callback(codeFile);
	}).open();
}

export function bulkCreateCodeFilesCommand(plugin: Quadro): void {
	new InputForMultipleFiles(plugin, async (userInput) => {
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
		new Notice(msg, failedFiles.length > 0 ? 0 : 3000);
	}).open();
}
