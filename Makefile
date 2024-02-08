.PHONY: build init release

build:
	VAULT_NAME="Development" ; \
	node esbuild.config.mjs && \
	if [[ "$$OSTYPE" =~ darwin* ]] ; then open "obsidian://open?vault=$$VAULT_NAME" ; fi

init:
	npm install && node esbuild.config.mjs

release:
	zsh ./.release.sh

