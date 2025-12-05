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

# Simple placeholder state machine; extend per real flow logic
resource "aws_sfn_state_machine" "flow_executor" {
  name     = "${var.product_name}-${var.env}-flow-executor"
  role_arn = aws_iam_role.sfn_exec.arn

  definition = jsonencode({
    Comment = "BayServe v2 flow executor skeleton",
    StartAt = "SuccessState",
    States = {
      SuccessState = {
        Type = "Succeed"
      }
    }
  })
}

resource "aws_iam_role" "sfn_exec" {
  name = "${var.product_name}-${var.env}-sfn-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "states.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "sfn_basic" {
  role       = aws_iam_role.sfn_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSStepFunctionsFullAccess"
}

output "state_machine_arn" {
  value = aws_sfn_state_machine.flow_executor.arn
}
