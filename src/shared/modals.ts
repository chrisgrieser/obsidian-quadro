import { ButtonComponent, FuzzySuggestModal, Instruction, Modal } from "obsidian";
import Quadro from "src/main";
import { QuadroSettings } from "src/settings/defaults";

/** adds navigation via tab & the common instructions */
export abstract class ExtendedFuzzySuggester<T> extends FuzzySuggestModal<T> {
	hotkeyInstructions: Instruction[] = [
		{ command: "↑ ↓", purpose: "Navigate" },
		{ command: "↹ ", purpose: "Down" },
		{ command: "shift ↹ ", purpose: "Up" },
		{ command: "⏎", purpose: "Select" },
		{ command: "esc", purpose: "Dismiss" },
	];
	plugin: Quadro;
	settings: QuadroSettings;

	constructor(plugin: Quadro) {
		super(plugin.app);
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.modalEl.addClass(plugin.cssclass);
		this.setInstructions(this.hotkeyInstructions);

		this.scope.register([], "Tab", (): void => {
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
		});
		this.scope.register(["Shift"], "Tab", (): void => {
			document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
		});
	}
}

export class ExtendedInputModal extends Modal {
	plugin: Quadro;
	confirmationButton?: ButtonComponent;

	constructor(plugin: Quadro) {
		super(plugin.app);
		this.plugin = plugin;
		this.modalEl.addClass(plugin.cssclass);
	}

	override onClose() {
		this.contentEl.empty();
	}
}
