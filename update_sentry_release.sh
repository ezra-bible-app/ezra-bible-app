#!/bin/bash

export SENTRY_AUTH_TOKEN="95245b3cdd784523b53ae3cf143e3d7965cecb8070c2460087687ccea9dec19e"
export SENTRY_ORG="tobias-klein"
VERSION=$(sentry-cli releases propose-version)

# Create a release
sentry-cli releases new -p ezra-project $VERSION

# Associate commits with the release
sentry-cli releases set-commits --auto $VERSION
