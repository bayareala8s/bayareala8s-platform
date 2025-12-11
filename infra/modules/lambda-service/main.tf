terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "product_name" { type = string }
variable "env"          { type = string }
variable "artifact_path" { type = string }
variable "flows_table_name" { type = string }
variable "state_machine_arn" { type = string }

provider "aws" {
  region = "us-west-2"
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.product_name}-${var.env}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_sfn" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess"
}

resource "aws_iam_role_policy" "lambda_bedrock_invoke" {
  name = "${var.product_name}-${var.env}-lambda-bedrock-invoke"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:Converse",
          "bedrock:ConverseStream",
        ]
        Resource = [
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_s3_secrets" {
  name = "${var.product_name}-${var.env}-lambda-s3-secrets"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name = "${var.product_name}-${var.env}-api"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "dist/handler.handler"
  runtime       = "nodejs20.x"
  filename      = var.artifact_path
  timeout       = 30
  source_code_hash = filebase64sha256(var.artifact_path)

  environment {
    variables = {
      NODE_ENV               = var.env
      PRODUCT_NAME           = var.product_name
      FLOWS_TABLE_NAME       = var.flows_table_name
      FLOW_STATE_MACHINE_ARN = var.state_machine_arn
      BEDROCK_REGION         = "us-east-1"
      BEDROCK_MODEL_ID       = "anthropic.claude-3-sonnet-20240229-v1:0"
    }
  }
}

output "lambda_arn" {
  value = aws_lambda_function.api.arn
}
