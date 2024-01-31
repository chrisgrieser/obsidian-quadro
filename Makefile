.PHONY: release build

build:
	npm run build

release:
	zsh ./.release.sh

