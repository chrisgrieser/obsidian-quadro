.PHONY: build init format release

# build & open dev-vault (if on macOS)
build:
	VAULT_NAME="Development" ; \
	node esbuild.config.mjs && \
	if [[ "$$OSTYPE" =~ darwin* ]] ; then open "obsidian://open?vault=$$VAULT_NAME" ; fi

# install dependencies, build, enable git hooks
init:
	npm install && \
	node esbuild.config.mjs ; \
	git config core.hooksPath .githooks

format: 
	biome format --write "$$(git rev-parse --show-toplevel)"

release:
	zsh ./.release.sh

