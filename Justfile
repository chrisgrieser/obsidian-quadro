set quiet := true

test_vault := "$HOME/Vaults/phd-data-analysis"

#───────────────────────────────────────────────────────────────────────────────

[macos]
build-and-reload:
    #!/usr/bin/env zsh
    node .esbuild.mjs
    cp -f "main.js" "{{ test_vault }}/.obsidian/plugins/quadro/main.js"
    vault_name=$(basename "{{ test_vault }}")
    open "obsidian://open?vault=$vault_name"

    # reload (INFO: requires registering the URI manually in a helper plugin)
    plugin_id=$(grep '"id"' "./manifest.json" | cut -d'"' -f4)
    open "obsidian://reload-plugin?id=$plugin_id&vault=$vault_name"

check-all:
    zsh ./.githooks/pre-commit

check-tsc-qf:
    npx tsc --noEmit --skipLibCheck --strict && echo "Typescript OK"

release:
    node .release.mjs

analyze:
    node .esbuild.mjs analyze

init:
    #!/usr/bin/env zsh
    git config core.hooksPath .githooks
    npm install
    node .esbuild.mjs

update-deps:
    #!/usr/bin/env zsh
    npm update
    node .esbuild.mjs
