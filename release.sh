#!/usr/bin/env zsh
# Release Obsidian Plugin
# https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877
# https://marcus.se.net/obsidian-plugin-docs/publishing/release-your-plugin-with-github-actions

#───────────────────────────────────────────────────────────────────────────────

# Prompt for version number
currentVersion=$(grep "version" "./manifest.json" | cut -d\" -f4)
echo "current version: $currentVersion"
echo -n "   next version: "
read -r nextVersion
echo "────────────────────────"

# set version number in `manifest.json`
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "manifest.json"
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "package.json"

# add version number in `versions.json`, assuming same compatibility
grep -Ev "^$" "versions.json" | grep -v "}" | sed -e '$ d' >temp
minObsidianVersion=$(grep -Ev "^$" "versions.json" | grep -v "}" | tail -n1 | cut -d\" -f4)
{
	echo "  \"$currentVersion\": \"$minObsidianVersion\","
	echo "  \"$nextVersion\": \"$minObsidianVersion\""
	echo "}"
} >>temp
mv temp versions.json

#───────────────────────────────────────────────────────────────────────────────

# push the manifest and versions JSONs
git add -A && git commit -m "release: $nextVersion"
git pull && git push

# trigger the release action
git tag "$nextVersion"
git push origin --tags
