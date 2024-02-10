import "obsidian";

declare module "obsidian" {
	interface Editor {
		editorComponent: {
			view: {
				// biome-ignore lint/correctness/noUndeclaredVariables: not needed here
				file: TFile;
			};
			app: App;
		};
	}
	interface App {
		commands: {
			executeCommandById: (commandId: string) => void;
		};
		// e.g. this.app.internalPlugins.plugins["note-composer"].enabled
		internalPlugins: {
			plugins: {
				[key: string]: {
					enabled: boolean;
				};
			};
		};
	}
}
