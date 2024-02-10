#!/bin/bash -e

cd $(dirname $0)/..

npm run build

npm run infra:code:generate

terraform -chdir=infrastructure/code apply --auto-approve
codeBucketRegion=$(terraform -chdir=infrastructure/code output --raw codeBucketRegion)
codeBucket=$(terraform -chdir=infrastructure/code output --raw codeBucket)
npm run bundle ${codeBucketRegion} ${codeBucket}

npm run infra:deploy
