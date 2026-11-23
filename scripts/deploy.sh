#!/usr/bin/env bash
# Uploads the built site (npm run build) and the bundled contact function (npm run build:lambda),
# then clears CloudFront's cache. The deploy job runs it, and it works by hand too. Needs
# SITE_BUCKET, DISTRIBUTION_ID and CONTACT_FUNCTION (`terraform -chdir=infra output` shows them).
set -euo pipefail

: "${SITE_BUCKET:?Set SITE_BUCKET}"
: "${DISTRIBUTION_ID:?Set DISTRIBUTION_ID}"
: "${CONTACT_FUNCTION:?Set CONTACT_FUNCTION}"

# Hashed assets never change, so browsers keep them for a year. They go up first, so a new page is
# never served before what it links to. Old ones aren't deleted, as cached pages may still use them.
aws s3 sync dist/_astro "s3://$SITE_BUCKET/_astro" --cache-control "public, max-age=31536000, immutable"

# Everything else: CloudFront keeps it until the invalidation below, and browsers check each time
aws s3 sync dist/ "s3://$SITE_BUCKET" --delete --exclude "_astro/*" --cache-control "public, max-age=0, s-maxage=31536000, must-revalidate"

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" --query Invalidation.Id --output text

aws lambda update-function-code --function-name "$CONTACT_FUNCTION" --zip-file fileb://.lambda/lambda.zip --query LastModified --output text
