function isObject(item: unknown): boolean {
	return Boolean(item && typeof item === "object" && !Array.isArray(item));
}

export function deepExtend(target: Record<string, unknown>, ...sources: Record<string, unknown>[]) {
	if (sources.length === 0) return target;
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) Object.assign(target, { [key]: {} });
				deepExtend(
					target[key] as Record<string, unknown>,
					source[key] as Record<string, unknown>,
				);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}

	return deepExtend(target, ...sources);
}
