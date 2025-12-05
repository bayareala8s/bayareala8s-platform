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

resource "aws_cognito_user_pool" "this" {
  name = "${var.product_name}-${var.env}-user-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  lambda_config {}

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "spa" {
  name         = "${var.product_name}-${var.env}-spa-client"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false
  callback_urls   = ["https://example.com/callback"] # TODO: replace with real UI URL
  logout_urls     = ["https://example.com"]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "profile", "email"]
  allowed_oauth_flows_user_pool_client = true
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_cognito_user_pool_domain" "domain" {
  domain       = "${var.product_name}-${var.env}-domain"
  user_pool_id = aws_cognito_user_pool.this.id
}

output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.spa.id
}

output "user_pool_domain" {
  value = aws_cognito_user_pool_domain.domain.domain
}
