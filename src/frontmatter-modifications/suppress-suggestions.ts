import type Quadro from "src/main";

// EXAMPLE css needed to suppress suggestions in the field "foobar"
// .app-container:has(.metadata-property[data-property-key="foobar"] .metadata-input-longtext:focus-within)~.suggestion-container {
// 	display: none;
// }

export function suppressCertainFrontmatterSuggestions(plugin: Quadro): void {
	const fieldSelector = plugin.settings.suppressSuggestionInFields
		.map((field) => `[data-property-key="${field}"]`)
		.join(", ");

	const cssToApply = fieldSelector
		? `.app-container:has(.metadata-property:is(${fieldSelector}) ` +
			":is(.metadata-input-longtext, .multi-select-container):focus-within) ~ .suggestion-container" +
			"{ display: none; }"
		: "";

	if (!plugin.styleElSuppressSuggestionsInFields) {
		const styleEl = activeDocument.createElement("style");
		styleEl.addClass(plugin.cssclass);
		styleEl.setAttribute("type", "text/css");
		activeDocument.head.appendChild(styleEl);
		plugin.register(() => styleEl?.detach()); // detach on unload
		plugin.styleElSuppressSuggestionsInFields = styleEl;
	}

	plugin.styleElSuppressSuggestionsInFields.textContent = cssToApply;
	plugin.app.workspace.trigger("css-change");
}
