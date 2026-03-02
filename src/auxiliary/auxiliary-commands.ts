import { openRandomUnreadDatafile } from "src/auxiliary/open-random-datafile";
import { markDatafileAsRead, revealProgressFile } from "src/auxiliary/progress-tracker";
import { saturationForExtraction } from "src/auxiliary/theoretical-saturation";
import type { CommandData } from "src/coding/coding-commands";

export const AUXILIARY_COMMANDS: CommandData[] = [
	{
		id: "open-random-unread-datafile",
		name: "Open random unread Data File",
		func: openRandomUnreadDatafile,
		hotkeyLetter: "n",
		icon: "shuffle",
		editorNeeded: false,
	},
	{
		id: "show-progress",
		name: "Show data analysis progress file",
		func: revealProgressFile,
		icon: "flag-triangle-right",
		editorNeeded: false,
	},
	{
		id: "mark-datafile-as-read",
		name: "Mark current Data File as read",
		func: markDatafileAsRead,
		hotkeyLetter: "r",
		icon: "file-check",
	},
	{
		id: "theoretical-saturation-for-extraction",
		name: "Show theoretical saturation for extraction",
		func: saturationForExtraction,
		icon: "chart-line",
		editorNeeded: false,
	},
];
