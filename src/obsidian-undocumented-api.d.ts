import type { TFile } from "obsidian";

declare module "obsidian" {
	interface Editor {
		editorComponent: {
			view: {
				file: TFile;
			};
		};
	}
}
