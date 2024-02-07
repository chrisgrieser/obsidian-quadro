.PHONY: build init release

build:
	node esbuild.config.mjs production && \
	if [[ "$$OSTYPE" =~ darwin* ]] ; then open "obsidian://open?vault=Development" ; fi

init:
	npm install && node esbuild.config.mjs production

release:
	zsh ./.release.sh

