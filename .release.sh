#!/usr/bin/env zsh
# RELEASE OBSIDIAN PLUGIN
# https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877
# https://marcus.se.net/obsidian-plugin-docs/publishing/release-your-plugin-with-github-actions
#───────────────────────────────────────────────────────────────────────────────

# Prompt for version number
currentVersion=$(grep "version" "./manifest.json" | cut -d\" -f4)
echo "current version: $currentVersion"
echo -n "   next version: "
read -r nextVersion
echo "────────────────────────"

# GUARD
if [[ -z "$nextVersion" || "$nextVersion" == "$currentVersion" ]]; then
	print "\033[1;31mInvalid version number\033[0m"
	exit 1
fi

# set version number in `manifest.json`
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "manifest.json"
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "package.json"

# add version number in `versions.json` (assuming same compatibility)
grep -Ev "^$" "versions.json" | grep -v "}" | sed -e '$ d' >temp
minObsidianVersion=$(grep -Ev "^$" "versions.json" | grep -v "}" | tail -n1 | cut -d\" -f4)
{
	print "\t\"$currentVersion\": \"$minObsidianVersion\","
	print "\t\"$nextVersion\": \"$minObsidianVersion\""
	echo "}"
} >>temp
mv temp versions.json

#───────────────────────────────────────────────────────────────────────────────

# push the manifest.json and versions.json
git add --all &&
	git commit -m "release: $nextVersion" &&
	git pull && git push &&
	git tag "$nextVersion" && git push origin --tags # trigger the release action
