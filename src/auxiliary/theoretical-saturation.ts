import {
	CategoryScale,
	Chart,
	type ChartConfiguration,
	type ChartItem,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	Title,
} from "chart.js";
import { Notice, normalizePath, type WorkspaceTabs } from "obsidian";
import { Canvas } from "skia-canvas";
import { getProgressFilepath, type TotalProgress } from "src/auxiliary/progress-tracker";
import type Quadro from "src/main";

function linearRegression(y: number[]) {
	const n = y.length;
	const x = y.map((_, i) => i + 1);
	const sumX = x.reduce((a, b) => a + b, 0);
	const sumY = y.reduce((a, b) => a + b, 0);
	const sumXy = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
	const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
	const m = (n * sumXy - sumX * sumY) / (n * sumX2 - sumX * sumX);
	const b = (sumY - m * sumX) / n;
	return x.map((xi) => m * xi + b);
}

export async function saturationForExtraction(plugin: Quadro): Promise<void> {
	const app = plugin.app;
	const progressFilepath = getProgressFilepath(plugin);
	const fileExists = await app.vault.adapter.exists(progressFilepath);
	const progress: TotalProgress = fileExists
		? JSON.parse(await app.vault.adapter.read(progressFilepath))
		: {};
	if (Object.keys(progress).length === 0) {
		new Notice("No progress data found.", 6000);
		return;
	}

	const extractionActionByDay = [];
	for (const [_, actions] of Object.entries(progress)) {
		const extractions = actions["Extraction File"];
		if (!extractions) continue;
		const newE = extractions.new ?? 0;
		const addedE = extractions["added paragraph"] ?? 0;
		const mergeE = extractions.merge ?? 0;
		if (newE + addedE + mergeE === 0) continue; // avoid division by zero ( no extractions anyway )
		const ratio = newE / (addedE + newE + mergeE);

		extractionActionByDay.push({
			newExtractions: newE,
			addedToExtractions: addedE,
			mergeExtractions: mergeE,
			ratio: ratio,
		});
	}
	// INFO no sorting needed,s ince the progress.json already sorted by isodate
	console.info("extractionActionByDay:", extractionActionByDay);

	//---------------------------------------------------------------------------

	// biome-ignore format: no need to read this regularly
	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Legend);
	Chart.defaults.font.size = 32;
	Chart.defaults.datasets.line.pointRadius = 0; // removes dots by default
	Chart.defaults.datasets.line.borderWidth = 3;
	const [width, height] = [2000, 1000];

	const canvas = new Canvas(width, height);
	const ctx = canvas.getContext("2d");

	const countFromOneToN = [...Array(extractionActionByDay.length)].map((_, i) => i + 1);
	const ratio = extractionActionByDay.map((day) => day.ratio);

	const config: ChartConfiguration<"line"> = {
		type: "line",
		data: {
			labels: countFromOneToN,
			datasets: [
				{
					label: "% of new Extractions to all Extraction actions",
					data: ratio,
					borderColor: "black",
				},
				{
					label: "trend (linear regression)",
					data: linearRegression(ratio),
					borderColor: "gray",
					borderDash: [15, 15], // makes the line dashed
				},
			],
		},
		options: {
			animation: false,
			responsive: false,
			plugins: {
				title: {
					display: true,
					text: [
						"Theoretical saturation of Extraction activities",
						"(the closer to 0%, the higher the theoretical saturation)",
					],
				},
			},
			scales: {
				x: {
					title: {
						display: true,
						text: "days with Extraction activity",
					},
				},
				y: {
					// use percentages instead of 0.x
					ticks: {
						callback: (value) => `${(Number(value) * 100).toFixed(0)}%`,
					},
				},
			},
		},
	};

	//---------------------------------------------------------------------------

	// create chart
	new Chart(ctx as unknown as ChartItem, config);
	const arrayBuffer = await canvas.toBuffer("png");
	const buffer = Buffer.from(arrayBuffer).buffer;

	// write png
	const filename = "theoretical-saturation-for-extraction.png";
	const outPath = normalizePath(plugin.settings.analysis.folder + "/" + filename);
	await app.vault.adapter.writeBinary(outPath, buffer);
	const pngTfile = app.vault.getFileByPath(outPath);
	if (!pngTfile) {
		new Notice("Could not create PNG file.", 6000);
		return;
	}

	// open image in new tab
	const currentLeaf = app.workspace.getLeaf();
	const tabgroup = currentLeaf.parent as WorkspaceTabs;
	const newTab = app.workspace.createLeafInParent(tabgroup, tabgroup.children.length);
	newTab.openFile(pngTfile);
}
