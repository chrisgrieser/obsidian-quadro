.PHONY: release build init

build:
	node esbuild.config.mjs production

init:
	npm install
	node esbuild.config.mjs production

release:
	zsh ./.release.sh

