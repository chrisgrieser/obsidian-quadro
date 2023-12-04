#!/usr/bin/env zsh

set -e # abort when any command errors, prevents this script from self-removing at the end if anything went wrong

echo -n "Plugin Name:"
read -r name

repo=$(git remote -v | head -n1 | sed 's/\.git.*//' | sed 's/.*://')

# plugin id is the same as the git repo name and can therefore be inferred
# INFO "The id can't contain `obsidian`." https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin#Step+3+Submit+your+plugin+for+review
id=$(echo "$repo" | cut -d/ -f2 | sed -E 's/-?obsidian-?//')

# desc can be inferred from github description (not using jq for portability)
desc=$(curl -sL "https://api.github.com/repos/$repo" | grep "description" | head -n1 | cut -d'"' -f4)

# plugin class can be id in camelcase and therefore also inferred
class=$(echo "$id" | perl -pe 's/^(\w)/\U$1/' | perl -pe 's/-(\w)/\U$1/g') # kebab-case to PascalCase

# current year for license
year=$(date +"%Y")

#───────────────────────────────────────────────────────────────────────────────

LC_ALL=C # prevent byte sequence error

# replace them all
# $1: placeholder name as {{mustache-template}}
# $2: the replacement
function replacePlaceholders() {
	# INFO macOS' sed requires `sed -i ''`, remove the `''` when on Linux or using GNU sed
	find . -type f -not -path '*/\.git/*' -not -name ".DS_Store" -not -path '*/node_modules/*' -exec sed -i '' "s/$1/$2/g" {} \;
}

replacePlaceholders "{{plugin-name}}" "$name"
replacePlaceholders "{{plugin-id}}" "$id"
replacePlaceholders "{{plugin-repo}}" "$repo"
replacePlaceholders "{{plugin-desc}}" "$desc"
replacePlaceholders "{{plugin-class}}" "$class"
replacePlaceholders "{{year}}" "$year"

osascript -e 'display notification "" with title "ℹ️ Write Permissions for workflow needed."'
open "https://github.com/$repo/settings/actions"

#───────────────────────────────────────────────────────────────────────────────

print "\033[1;32mSuccess. Script will delete itself."

# make this script delete itself
rm -- "$0"
