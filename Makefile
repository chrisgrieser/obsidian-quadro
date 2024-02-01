.PHONY: release build init

build:
	node esbuild.config.mjs production

init:
	npm install

release:
	zsh ./.release.sh

