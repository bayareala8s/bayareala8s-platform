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