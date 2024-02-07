import type { TFile, App } from "obsidian";

declare module "obsidian" {
	interface Editor {
		editorComponent: {
			view: {
				file: TFile;
			};
			app: App;
		};
	}
}
