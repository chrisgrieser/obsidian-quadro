set quiet := true

dev_vault := "$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Development"
plugin_path := dev_vault + "/.obsidian/plugins/quadro"

# if on macOS, open dev-vault & create symlink to it if needed
build:
    node .esbuild.config.mjs
    [[ "$OSTYPE" =~ darwin* ]] || exit 0
    test -e "{{ plugin_path }}" || ln -sv "$PWD" "{{ plugin_path }}"
    open "obsidian://open?vault=$(basename "{{ dev_vault }}")"

format:
    npx biome format --write "$(git rev-parse --show-toplevel)"
    npx markdownlint-cli --fix --ignore="node_modules" "$(git rev-parse --show-toplevel)"

check_all:
    zsh ./.githooks/pre-commit

check_tsc_quickfix:
    npx tsc --noEmit --skipLibCheck --strict && echo "Typescript OK"

release:
    node .release.mjs

# install dependencies, build, enable git hooks
init:
    npm install
    node .esbuild.config.mjs
    git config core.hooksPath .githooks
