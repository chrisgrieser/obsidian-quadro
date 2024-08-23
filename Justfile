set quiet := true

alias i := init

vault_path := "$HOME/Vaults/phd-data-analysis"

#───────────────────────────────────────────────────────────────────────────────

build-and-reload:
    #!/usr/bin/env zsh
    node .esbuild.mjs
    cp -f "main.js" "{{ vault_path }}/.obsidian/plugins/quadro/main.js"
    vault_name=$(basename "{{ vault_path }}")
    open "obsidian://open?vault=$vault_name"

    # reload (INFO: requires registering the URI manually)
    plugin_id=$(grep '"id"' "./manifest.json" | cut -d'"' -f4)
    open "obsidian://reload-plugin?id=$plugin_id&vault=$vault_name"

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
init:
    #!/usr/bin/env zsh
    git config core.hooksPath .githooks
    npm install
    node .esbuild.mjs

update-deps:
    #!/usr/bin/env zsh
    npm update
    node .esbuild.mjs
