terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

# Inputs via tfvars or CI/CD
variable "domain_name" {}
variable "certificate_arn" {}
variable "lambda_artifact_path" {}

# Cognito for BayServe v2
module "bayserve_v2_cognito" {
  source       = "../../modules/cognito"
  product_name = "bayserve-v2"
  env          = "prod"
}

# DynamoDB for flows
module "bayserve_v2_dynamodb" {
  source       = "../../modules/dynamodb"
  product_name = "bayserve-v2"
  env          = "prod"
}

# DynamoDB for jobs
module "bayserve_v2_dynamodb" {
  source       = "../../modules/dynamodb"
  product_name = "bayflow"
  env          = "prod"
}

# Step Functions skeleton
module "bayserve_v2_sfn" {
  source       = "../../modules/stepfunctions"
  product_name = "bayserve-v2"
  env          = "prod"
}

# Lambda backend
module "bayserve_v2_lambda" {
  source            = "../../modules/lambda-service"
  product_name      = "bayserve-v2"
  env               = "prod"
  artifact_path     = var.lambda_artifact_path
  flows_table_name  = module.bayserve_v2_dynamodb.flows_table_name
  state_machine_arn = module.bayserve_v2_sfn.state_machine_arn
}

# API Gateway protected by Cognito
module "bayserve_v2_api" {
  source              = "../../modules/api-gateway"
  product_name        = "bayserve-v2"
  env                 = "prod"
  lambda_arn          = module.bayserve_v2_lambda.lambda_arn
  authorizer_issuer   = "https://cognito-idp.us-west-2.amazonaws.com/${module.bayserve_v2_cognito.user_pool_id}"
  authorizer_audience = module.bayserve_v2_cognito.user_pool_client_id
}

# Frontend hosting
module "bayserve_v2_frontend" {
  source          = "../../modules/frontend"
  product_name    = "bayserve-v2"
  env             = "prod"
  domain_name     = var.domain_name
  certificate_arn = var.certificate_arn
}

output "bayserve_v2_api_endpoint" {
  value = module.bayserve_v2_api.api_endpoint
}

output "bayserve_v2_cloudfront_domain" {
  value = module.bayserve_v2_frontend.cloudfront_domain_name
}

output "bayserve_v2_user_pool_id" {
  value = module.bayserve_v2_cognito.user_pool_id
}

output "bayserve_v2_user_pool_client_id" {
  value = module.bayserve_v2_cognito.user_pool_client_id
}
