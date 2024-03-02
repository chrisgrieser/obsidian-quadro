#!/usr/bin/env zsh
# RELEASE OBSIDIAN PLUGIN
# https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877
# https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions
#───────────────────────────────────────────────────────────────────────────────

# Prompt for version number
currentVersion=$(grep "version" "./manifest.json" | cut -d\" -f4)
echo "current version: $currentVersion"
echo -n "   next version: "
read -r nextVersion

# GUARD
if [[ -z "$nextVersion" || "$nextVersion" == "$currentVersion" ]]; then
	print "\033[1;31mInvalid version number\033[0m"
	exit 1
fi

# set version number in `manifest.json`
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "manifest.json"
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "package.json"

# add version number in `versions.json` with min-app-version
minObsidianVersion=$(grep "minAppVersion" "manifest.json" | cut -d\" -f4)
last_version_line=$(tail -n2 "versions.json" | head -n1)
sed -i '' '$d' "versions.json"
sed -i '' '$d' "versions.json"
{
	echo "$last_version_line,"
	print "\t\"$nextVersion\": \"$minObsidianVersion\""
	echo "}"
} >>"versions.json"

#───────────────────────────────────────────────────────────────────────────────

# push the manifest.json and versions.json
echo "────────────────────────"
git add "manifest.json" "versions.json" "package.json" &&
	git commit -m "release: $nextVersion" &&
	git pull && git push &&
	git tag "$nextVersion" && git push origin --tags # trigger the release action
