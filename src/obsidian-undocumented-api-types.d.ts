import "obsidian";

declare module "obsidian" {
	interface Editor {
		editorComponent: {
			view: {
				// biome-ignore lint/correctness/noUndeclaredVariables: tsserver auto-removes the import as unused
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
					enable: () => void;
				};
			};
		};
	}
}
