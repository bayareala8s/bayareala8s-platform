terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "product_name" {
  type = string
}

variable "env" {
  type = string
}

variable "region" {
  type    = string
  default = "us-west-2"
}

provider "aws" {
  region = var.region
}

# Execution role for the state machine
resource "aws_iam_role" "sfn_exec" {
  name = "${var.product_name}-${var.env}-sfn-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# 🔧 FIX: use the correct AWS-managed policy ARN (no 'service-role/' prefix)
resource "aws_iam_role_policy_attachment" "sfn_basic" {
  role       = aws_iam_role.sfn_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess"
}

# Simple placeholder state machine for BayServe v2 flows
resource "aws_sfn_state_machine" "flow_execution" {
  name     = "${var.product_name}-${var.env}-flow-execution"
  role_arn = aws_iam_role.sfn_exec.arn

  definition = jsonencode({
    Comment = "BayServe v2 placeholder flow execution state machine"
    StartAt = "Success"
    States = {
      Success = {
        Type = "Succeed"
      }
    }
  })
}

output "state_machine_arn" {
  value = aws_sfn_state_machine.flow_execution.arn
}
