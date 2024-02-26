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
		plugins: {
			enabledPlugins: Set<string>;
			enablePluginAndSave: (pluginId: string) => Promise<boolean>;
			plugins: {
				[key: string]: object;
			};
		};
		metadataTypeManager: {
			// biome-ignore lint/correctness/noUndeclaredVariables: tsserver auto-removes the import as unused
			getPropertyInfo(property: string): PropertyInfo;
			/** @internal */
			// biome-ignore lint/correctness/noUndeclaredVariables: tsserver auto-removes the import as unused
			setType(property: string, type: PropertyWidgetType): void;
		};
	}
}
