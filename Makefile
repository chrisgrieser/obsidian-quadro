.PHONY: build init format release

# build & open dev-vault (if on macOS)
build:
	VAULT_NAME="Development" ; \
	node esbuild.config.mjs && \
	if [[ "$$OSTYPE" =~ darwin* ]] ; then open "obsidian://open?vault=$$VAULT_NAME" ; fi

# install dependencies, build, enable git hooks
init:
	npm install && \
	node esbuild.config.mjs
	git config core.hooksPath .githooks

format: 
	npx biome format --write "$$(git rev-parse --show-toplevel)"
	npx markdownlint-cli --fix --ignore="node_modules" "$$(git rev-parse --show-toplevel)"

check:
	zsh ./.githooks/pre-commit

release:
	zsh ./.release.sh

