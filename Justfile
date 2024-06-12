set quiet := true

dev_vault := "$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Development"
plugin_path := dev_vault + "/.obsidian/plugins/" + `basename "$PWD"`

#───────────────────────────────────────────────────────────────────────────────

_build:
    node .esbuild.mjs

# if on macOS, open dev-vault & create symlink to it if needed
build-and-reload: _build
    [[ "$OSTYPE" =~ darwin* ]] || exit 0
    test -e "{{ plugin_path }}" || ln -sv "$PWD" "{{ plugin_path }}"
    open "obsidian://open?vault=$(basename "{{ dev_vault }}")"

format:
    npx biome format --write "$(git rev-parse --show-toplevel)"
    npx markdownlint-cli --fix --ignore="node_modules" "$(git rev-parse --show-toplevel)"

check-all:
    zsh ./.githooks/pre-commit

check-tsc:
    npx tsc --noEmit --skipLibCheck --strict && echo "Typescript OK"

release:
    node .release.mjs

# install dependencies, build, enable git hooks
init: && _build
    git config core.hooksPath .githooks
    npm install

update-deps: && _build
    npm update
