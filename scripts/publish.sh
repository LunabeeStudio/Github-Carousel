#!/bin/sh
# Uploads the package to the Chrome Web Store and submits it for review.
# Needs gcloud signed in with an account allowed to impersonate the service account.
# Bump "version" in manifest.json first: the store rejects a version it already has.
set -eu
cd "$(dirname "$0")/.."
publisher=ff0a3988-a0ed-4155-8ae3-a4a51dbae4cc
item=pgajloghnpfeocipggknjebodkmbfbhb
service_account=${CWS_SERVICE_ACCOUNT:-cws-publisher@github-carousel.iam.gserviceaccount.com}
api=https://chromewebstore.googleapis.com
name="publishers/$publisher/items/$item"

zip=$(scripts/package.sh)
token=$(gcloud auth print-access-token --impersonate-service-account="$service_account" \
  --scopes=https://www.googleapis.com/auth/chromewebstore 2>/dev/null)

# Prints the response body, or sends it to stderr and fails on an HTTP error.
call() {
  body=$(curl -sS --fail-with-body -H "Authorization: Bearer $token" "$@") || {
    echo "$body" >&2
    return 1
  }
  echo "$body"
}

echo "Uploading $zip"
res=$(call -X POST -T "$zip" "$api/upload/v2/$name:upload")
state=$(echo "$res" | jq -r .uploadState)
while [ "$state" = IN_PROGRESS ]; do
  sleep 5
  res=$(call "$api/v2/$name:fetchStatus")
  state=$(echo "$res" | jq -r .lastAsyncUploadState)
done
if [ "$state" != SUCCEEDED ]; then
  echo "Upload failed: $res" >&2
  exit 1
fi

echo "Submitting for review"
res=$(call -X POST -H 'Content-Type: application/json' -d '{"publishType":"DEFAULT_PUBLISH"}' \
  "$api/v2/$name:publish")
echo "$res" | jq -r .state
