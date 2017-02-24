#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

SOURCE_BRANCH="master"

# Pull requests and commits to other branches shouldn't try to deploy, just build to verify
#if [ "$TRAVIS_PULL_REQUEST" != "false" -o "$TRAVIS_BRANCH" != "$SOURCE_BRANCH" ]; then
#    echo "Skipping publish-test-cov-badge"
#    exit 0
#fi

# Save some useful information
SHA=`git rev-parse --verify HEAD`

#git clone --quiet https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} publish-badge > /dev/null
git clone https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} publish-badge

cp coverage/code-coverage.svg publish-badge/coverage/code-coverage.svg

cd publish-badge

# Now let's go have some fun with the cloned repo
git config user.name "Travis CI"
git config user.email "travis@travis-ci.org"

echo "Publishing new coverage badge..."
git add -f ./coverage/code-coverage.svg
git commit -m "Updating test coverage badge: ${SHA} [ci skip]"
git push -fq origin > /dev/null
