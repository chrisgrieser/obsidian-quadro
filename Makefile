.PHONY: build format check-all check-tsc release init

# build & open dev-vault (if on macOS)
build:
	VAULT_NAME="Development" ; \
	node esbuild.config.mjs && \
	if [[ "$$OSTYPE" =~ darwin* ]] ; then open "obsidian://open?vault=$$VAULT_NAME" ; fi

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
	npm install && node esbuild.config.mjs ; \
	git config core.hooksPath .githooks

