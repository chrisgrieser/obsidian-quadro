#!/usr/bin/env zsh
# REQUIRED macOS version of `sed`
# RELEASE OBSIDIAN PLUGIN https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions

#───────────────────────────────────────────────────────────────────────────────
# PROMPT FOR VERSION NUMBER

currentVersion=$(grep "version" "./manifest.json" | cut -d\" -f4)
echo "current version: $currentVersion"
echo -n "   next version: "
read -r nextVersion
if [[ -z "$nextVersion" || "$nextVersion" == "$currentVersion" ]]; then
	print "\033[1;31mInvalid version number\033[0m"
	return 1
fi

#───────────────────────────────────────────────────────────────────────────────
# UPDATE VERSION NUMBER

# manifest.json & package.json
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "manifest.json"
sed -E -i '' "s/\"version\".*/\"version\": \"$nextVersion\",/" "package.json"

# package-lock.json: can be updated via `npm`
npm install &>/dev/null

# versions.json: insert version number with min-app-version from manifest
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
# GIT ADD, COMMIT, AND PUSH

echo "────────────────────────"
git add "manifest.json" "versions.json" "package.json" &&
	git commit -m "release: $nextVersion" &&
	git pull && git push &&
	git tag "$nextVersion" && git push origin --tags # trigger the release action
