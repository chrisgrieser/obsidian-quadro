import "obsidian";

declare module "obsidian" {
	interface FuzzySuggestModal<T> {
		chooser?: {
			useSelectedItem: (evt: KeyboardEvent) => boolean;
			moveDown: (count: number) => void;
			moveUp: (count: number) => void;
		};
	}
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
	interface FileManager {
		/**
		 * Merge two files
		 * @param file - File to merge to
		 * @param otherFile - File to merge from
		 * @param override - If not empty, will override the contents of the file with this string
		 * @param atStart - Whether to insert text at the start or end of the file
		 */
		// biome-ignore lint/correctness/noUndeclaredVariables: tsserver auto-removes the import as unused
		mergeFile(file: TFile, otherFile: TFile, override: string, atStart: boolean): Promise<void>;
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
	interface Vault {
		setConfig(key: string, value: string | number | boolean): void;
	}
}
