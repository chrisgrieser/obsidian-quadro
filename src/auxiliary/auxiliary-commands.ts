import { CommandData } from "src/coding/coding-commands";
import { markDatafileAsRead, revealProgressFile } from "./progress-tracker";

export const AUXILIARY_COMMANDS: CommandData[] = [
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
