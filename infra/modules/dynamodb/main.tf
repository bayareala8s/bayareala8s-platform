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

provider "aws" {
  region = "us-west-2"
}

resource "aws_dynamodb_table" "flows" {
  name         = "${var.product_name}-${var.env}-flows"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

####################
# DynamoDB - Job Tracking
####################

resource "aws_dynamodb_table" "jobs" {
  name         = "${var.product_name}-${var.env}-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "job_id"
  range_key    = "file_name"

  attribute {
    name = "job_id"
    type = "S"
  }

  attribute {
    name = "file_name"
    type = "S"
  }

  # Tenant + flow for future querying
  attribute {
    name = "tenant"
    type = "S"
  }

  attribute {
    name = "flow_id"
    type = "S"
  }

  global_secondary_index {
    name            = "tenant_flow_idx"
    hash_key        = "tenant"
    range_key       = "flow_id"
    projection_type = "ALL"
  }

  tags = local.tags
}

output "flows_table_name" {
  value = aws_dynamodb_table.flows.name
}

output "jobs_table_name" {
  value = aws_dynamodb_table.jobs.name
}
