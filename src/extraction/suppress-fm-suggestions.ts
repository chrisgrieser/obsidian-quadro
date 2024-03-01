import Quadro from "src/main";

// EXAMPLE css needed to surppress suggestions in the field "foobar"
// .app-container:has(.metadata-property[data-property-key="foobar"] .metadata-input-longtext:focus-within)~.suggestion-container {
// 	display: none;
// }

export function suppressCertainFrontmatterSuggestions(plugin: Quadro): void {
	const fields = plugin.settings.suppressSuggestionFields || [];
	const fieldSelector: string[] = [];
	for (const field of fields) {
		fieldSelector.push(`[data-property-key="${field}"]`);
	}

	const cssToApply =
		`.app-container:has(.metadata-property:is(${fieldSelector.join(", ")}) ` +
		":is(.metadata-input-longtext, .multi-select-container):focus-within) ~ .suggestion-container" +
		"{ display: none; }";

	if (!plugin.styleEl) {
		plugin.styleEl = activeDocument.createElement("style");
		plugin.styleEl.addClass(plugin.cssclass);
		plugin.styleEl.setAttribute("type", "text/css");
		activeDocument.head.appendChild(plugin.styleEl);
		plugin.register(() => plugin.styleEl?.detach()); // detach on unload
	}
	plugin.styleEl.textContent = cssToApply;

	plugin.app.workspace.trigger("css-change");
}
