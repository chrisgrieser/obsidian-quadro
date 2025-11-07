// DOCS https://github.com/obsidianmd/eslint-plugin#usage
//──────────────────────────────────────────────────────────────────────────────

import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: { project: "./tsconfig.json" },
		},
		// @ts-expect-error
		plugins: { obsidianmd: obsidianmd },
		rules: {
			// PENDING https://github.com/obsidianmd/eslint-plugin/pull/70
			"obsidianmd/commands/no-command-in-command-id": "error",
			"obsidianmd/commands/no-command-in-command-name": "error",
			"obsidianmd/commands/no-default-hotkeys": "error",
			"obsidianmd/commands/no-plugin-id-in-command-id": "error",
			"obsidianmd/commands/no-plugin-name-in-command-name": "error",
			"obsidianmd/settings-tab/no-manual-html-headings": "error",
			"obsidianmd/settings-tab/no-problematic-settings-headings": "error",
			"obsidianmd/vault/iterate": "error",
			"obsidianmd/detach-leaves": "error",
			"obsidianmd/hardcoded-config-path": "error",
			"obsidianmd/no-forbidden-elements": "error",
			"obsidianmd/no-plugin-as-component": "error",
			"obsidianmd/no-sample-code": "error",
			"obsidianmd/no-tfile-tfolder-cast": "error",
			"obsidianmd/no-view-references-in-plugin": "error",
			"obsidianmd/no-static-styles-assignment": "error",
			"obsidianmd/object-assign": "error",
			"obsidianmd/platform": "error",
			"obsidianmd/prefer-file-manager-trash-file": "warn",
			"obsidianmd/prefer-abstract-input-suggest": "error",
			"obsidianmd/regex-lookbehind": "error",
			"obsidianmd/sample-names": "error",
			"obsidianmd/validate-manifest": "error",
			"obsidianmd/validate-license": ["error"],
		},
	},
	{
		// @ts-expect-error
		plugins: { obsidianmd: obsidianmd },
		rules: {
			// special terms in the context of the plugin
			"obsidianmd/ui/sentence-case": [
				"warn",
				{
					brands: [
						"Data File",
						"Data Files",
						"Code File",
						"Code Files",
						"Extraction File",
						"Extraction Files",
						"Codes Folder",
						"Extraction Folder",
					],
				},
			],
		},
	},
]);
