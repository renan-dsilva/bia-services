#!/usr/bin/env bash

BUCKET=bia-site
SOURCE_DIR=/Users/marceloreis/Mobile/Foursys/Bia/media/site/

export AWS_ACCESS_KEY_ID=AKIARZJM6CCYJHXIXTJP
export AWS_SECRET_ACCESS_KEY=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
export AWS_DEFAULT_REGION=sa-east-1


echo "Removing all files on bucket"
aws s3 rm s3://${BUCKET} --recursive


echo "Attempting to upload site .."
echo "Command:  aws s3  sync $SOURCE_DIR s3://$BUCKET/"
aws s3  sync ${SOURCE_DIR} s3://${BUCKET}/
echo "S3 Upload complete"

echo "Invalidating cloudfrond distribution to get fresh cache"
aws cloudfront create-invalidation --distribution-id=E2NTHZH8C92HCC --paths * --profile=bia

echo "Deployment complete"  