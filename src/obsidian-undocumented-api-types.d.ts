import "obsidian";

declare module "obsidian" {
	interface Workspace {
		getAdjacentLeafInDirection: (
			// biome-ignore lint/correctness/noUndeclaredVariables: tsserver auto-removes the import as unused
			leaf: WorkspaceLeaf,
			direction: "top" | "bottom" | "left" | "right",
			// biome-ignore lint/correctness/noUndeclaredVariables: tsserver auto-removes the import as unused
		) => WorkspaceLeaf | null;
	}
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
		showInFolder: (path: string) => void;
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
		plugins: {
			enabledPlugins: Set<string>;
			enablePluginAndSave: (pluginId: string) => Promise<boolean>;
			plugins: {
				[key: string]: object;
			};
		};
	}
	interface Vault {
		config: {
			trashOption: "local" | "system" | "none";
		};
	}
}
