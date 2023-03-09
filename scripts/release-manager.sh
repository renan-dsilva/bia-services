#!/usr/bin/env bash

BUCKET=media-bia
SOURCE_MANAGER=/Users/marceloreis/Mobile/Foursys/Bia/media/manager/
SOURCE_DIR=${SOURCE_MANAGER}dist/

export AWS_ACCESS_KEY_ID=AKIAQGKWEBC5554TOS4R
export AWS_SECRET_ACCESS_KEY=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
export AWS_DEFAULT_REGION=sa-east-1


echo "Generate a prod version of manager"
cd ${SOURCE_MANAGER}
ng build --prod

echo "Removing all files on bucket"
aws s3 rm s3://${BUCKET} --recursive


echo "Attempting to upload manager .."
echo "Command:  aws s3  sync $SOURCE_DIR s3://$BUCKET/"
aws s3  sync ${SOURCE_DIR} s3://${BUCKET}/
echo "S3 Upload complete"

# echo "Invalidating cloudfrond distribution to get fresh cache"
# aws cloudfront create-invalidation --distribution-id=EO9IZ33BN2DDQ --paths / --profile=bia

echo "Deployment complete"  