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

####################
# S3 Buckets
####################

resource "aws_s3_bucket" "landing" {
  bucket = "${var.product_name}-${var.env}-landing"
}

resource "aws_s3_bucket" "target" {
  bucket = "${var.product_name}-${var.env}-target"
}

resource "aws_s3_bucket" "config" {
  bucket = "${var.product_name}-${var.env}-config"
}

resource "aws_s3_bucket_notification" "landing_eventbridge" {
  bucket = aws_s3_bucket.landing.id

  eventbridge = true
}

resource "aws_s3_bucket_public_access_block" "pab" {
  for_each = {
    landing = aws_s3_bucket.landing.id
    target  = aws_s3_bucket.target.id
    config  = aws_s3_bucket.config.id
  }

  bucket                  = each.value
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sse" {
  for_each = {
    landing = aws_s3_bucket.landing.id
    target  = aws_s3_bucket.target.id
    config  = aws_s3_bucket.config.id
  }

  bucket = each.value

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}




####################
# Outputs
####################

output "landing_bucket_name" {
  value = aws_s3_bucket.landing.id
}

output "target_bucket_name" {
  value = aws_s3_bucket.target.id
}

output "config_bucket_name" {
  value = aws_s3_bucket.config.id
}