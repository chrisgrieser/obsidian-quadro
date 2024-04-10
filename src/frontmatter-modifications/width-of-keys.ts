import Quadro from "src/main";

// INFO CSS needed
// body .metadata-property-key { min-width: 40%; }

export function setCssForWidthOfKeys(plugin: Quadro): void {
	const widthPercent = plugin.settings.propertiesKeysWidthPercent;
	const cssToApply = `body .metadata-property-key { min-width: ${widthPercent}% }`;

	if (!plugin.styleElPropertyKeyWidth) {
		const styleEl = activeDocument.createElement("style");
		styleEl.addClass(plugin.cssclass);
		styleEl.setAttribute("type", "text/css");
		activeDocument.head.appendChild(styleEl);
		plugin.register(() => styleEl?.detach()); // detach on unload
		plugin.styleElPropertyKeyWidth = styleEl;
	}

	plugin.styleElPropertyKeyWidth.textContent = cssToApply;
	plugin.app.workspace.trigger("css-change");
}
