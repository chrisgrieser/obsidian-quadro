import type { CommandData } from "src/coding/coding-commands";
import { openRandomUnreadDatafile } from "./open-random-datafile";
import { markDatafileAsRead, revealProgressFile } from "./progress-tracker";

export const AUXILIARY_COMMANDS: CommandData[] = [
	{
		id: "open-random-unread-datafile",
		name: "Open random unread Data File",
		func: openRandomUnreadDatafile,
		hotkeyLetter: "n",
		icon: "shuffle",
	},
	{
		id: "show-progress",
		name: "Show data analysis progress file",
		func: revealProgressFile,
		icon: "flag-triangle-right",
	},
	{
		id: "mark-datafile-as-read",
		name: "Mark current Data File as read",
		func: markDatafileAsRead,
		hotkeyLetter: "r",
		icon: "file-check",
	},
];
