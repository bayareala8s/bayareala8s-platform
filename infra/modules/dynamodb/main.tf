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

output "flows_table_name" {
  value = aws_dynamodb_table.flows.name
}
