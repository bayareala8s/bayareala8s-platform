#!/usr/bin/env bash
set -euo pipefail

# Simple one-time demo setup for BayServe SFTP->S3 transfer.
#
# Prereqs:
# - AWS CLI v2 installed and configured (aws configure)
# - IAM user/role with permissions for: transfer, s3, iam, secretsmanager
# - Region us-west-2 (can be overridden via AWS_REGION env var)

REGION="${AWS_REGION:-us-west-2}"
DEMO_BUCKET="bayserve-demo-sftp-source-$(date +%s)"
TRANSFER_USER="demo-user"
SECRET_NAME="bayserve/demo-sftp/private-key"
KEY_PREFIX="demo-sftp-key"

echo "Using region: ${REGION}"
echo "Demo SFTP backing bucket: ${DEMO_BUCKET}"
echo "Transfer Family user: ${TRANSFER_USER}"
echo "Secrets Manager secret: ${SECRET_NAME}"

echo "=== 1) Create S3 bucket for Transfer Family backing store ==="
aws s3api create-bucket \
  --bucket "${DEMO_BUCKET}" \
  --region "${REGION}" \
  --create-bucket-configuration LocationConstraint="${REGION}"

echo "=== 2) Create IAM role for AWS Transfer Family ==="
ROLE_NAME="bayserve-demo-transfer-role"

if ! aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "${ROLE_NAME}" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": { "Service": "transfer.amazonaws.com" },
          "Action": "sts:AssumeRole"
        }
      ]
    }'

  aws iam put-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-name "bayserve-demo-transfer-s3" \
    --policy-document "$(cat <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::${DEMO_BUCKET}",
        "arn:aws:s3:::${DEMO_BUCKET}/*"
      ]
    }
  ]
}
POLICY
)"
else
  echo "IAM role ${ROLE_NAME} already exists, reusing."
fi

ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)

echo "Transfer IAM role ARN: ${ROLE_ARN}"

echo "=== 3) Create AWS Transfer Family SFTP server ==="
SERVER_ID=$(aws transfer create-server \
  --protocols SFTP \
  --identity-provider-type SERVICE_MANAGED \
  --endpoint-type PUBLIC \
  --region "${REGION}" \
  --query 'ServerId' --output text)

ENDPOINT="${SERVER_ID}.server.transfer.${REGION}.amazonaws.com"

echo "Created Transfer server: ${SERVER_ID}"
echo "SFTP endpoint: ${ENDPOINT}"

echo "=== 4) Generate SSH key pair for SFTP user (if not present) ==="
if [ ! -f "${KEY_PREFIX}" ]; then
  ssh-keygen -t rsa -b 4096 -f "${KEY_PREFIX}" -N ""
else
  echo "Key ${KEY_PREFIX} already exists, reusing."
fi

PUB_KEY=$(cat "${KEY_PREFIX}.pub")


echo "=== 5) Create Transfer Family user ==="
HOME_DIR="/${DEMO_BUCKET}/home/${TRANSFER_USER}"

aws transfer create-user \
  --server-id "${SERVER_ID}" \
  --user-name "${TRANSFER_USER}" \
  --role "${ROLE_ARN}" \
  --home-directory "${HOME_DIR}" \
  --ssh-public-key-body "${PUB_KEY}"

echo "Created user ${TRANSFER_USER} with home directory ${HOME_DIR}"

echo "=== 6) Store private key in Secrets Manager ==="
PRIVATE_KEY_CONTENT=$(cat "${KEY_PREFIX}")

if aws secretsmanager describe-secret --secret-id "${SECRET_NAME}" >/dev/null 2>&1; then
  echo "Secret ${SECRET_NAME} already exists, updating value."
  aws secretsmanager put-secret-value \
    --secret-id "${SECRET_NAME}" \
    --secret-string "${PRIVATE_KEY_CONTENT}"
else
  aws secretsmanager create-secret \
    --name "${SECRET_NAME}" \
    --secret-string "${PRIVATE_KEY_CONTENT}"
fi

echo "=== 7) Upload a sample file into the SFTP home backing bucket via S3 ==="
mkdir -p tmp-demo
printf "BayServe demo file at $(date)\n" > tmp-demo/sample1.txt
aws s3 cp tmp-demo/sample1.txt "s3://${DEMO_BUCKET}/home/${TRANSFER_USER}/sample1.txt"


echo "=== DONE ==="
echo "Use these values in the BayServe UI Connections form:"
echo "  SFTP host:    ${ENDPOINT}"
echo "  SFTP port:    22"
echo "  SFTP username: ${TRANSFER_USER}"
echo "  Remote path:  ."
echo "  Auth:         Private key (Secrets Manager)"
echo "  Secret id:    ${SECRET_NAME}"
echo "  S3 bucket:    (e.g. bayflow-prod-target)"
echo "  S3 prefix:    demo/"
