#!/bin/sh

GITHUB_TOKEN=4c6c8c915b3308309324ff26bc037d2b8235cccc
GITHUB_REPO_OWNER=tobias-klein
GITHUB_REPO=ezra-project

curl -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H 'Accept: application/vnd.github.everest-preview+json' \
    -d '{"event_type":"rollback"}' \
    https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO}/dispatches
