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
			leaf: WorkspaceLeaf,
			direction: "top" | "bottom" | "left" | "right",
		) => WorkspaceLeaf | null;
	}
	interface WorkspaceLeaf {
		parent: WorkspaceTabs;
	}
	interface MarkdownView {
		metadataEditor: {
			rendered: {
				focusValue: () => void;
				focusKey: () => void;
			}[];
		};
	}
	interface MarkdownSubView {
		cleanupLivePreview?: () => void;
	}
	interface WorkspaceTabs {
		// sets the css `flex-grow` of the tab group, meaning the number is a
		// ratio, with `1` being the default value for this (and all other tab
		// groups). Example: Setting to `3` in a split with two tab groups will
		// result in in a 1:3 ratio, making the tab group take 3/4 or 75% of the
		// width/height in the workspace.
		setDimension: (dimension: number) => void;
		children: WorkspaceLeaf[];
	}
	interface Editor {
		editorComponent: {
			view: MarkdownView;
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
	interface MetadataCache {
		getFrontmatterPropertyValuesForKey: (key: string) => string[];
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
		internalPlugins: {
			plugins: {
				[key: string]: {
					enable: () => void;
				};
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
