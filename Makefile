.PHONY: build format check-all check-tsc release init

# if on macOS, open dev-vault & create symlink to if needed
build:
	dev_vault="$$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Development" ; \
	node esbuild.config.mjs && \
	if [[ "$$OSTYPE" =~ darwin* ]] ; then \
		plugin_path="$$dev_vault/.obsidian/plugins/quadro" ; \
		[[ -e "$$plugin_path" ]] || ln -s "$$PWD" "$$plugin_path" ; \
		vault_name=$$(basename "$$dev_vault") ; \
		open "obsidian://open?vault=$$vault_name" ; \
	fi

format:
	npx biome format --write "$$(git rev-parse --show-toplevel)"
	npx markdownlint-cli --fix --ignore="node_modules" "$$(git rev-parse --show-toplevel)"

check-all:
	zsh ./.githooks/pre-commit

check-tsc:
	npx tsc --noEmit --skipLibCheck --strict && echo "Typescript OK"

release:
	zsh ./.release.sh

# install dependencies, build, enable git hooks
init:
	npm install && \
	node esbuild.config.mjs ; \
	git config core.hooksPath .githooks

