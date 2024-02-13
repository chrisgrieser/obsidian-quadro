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
		statusBar: {
			containerEl: HTMLElement;
		};
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
