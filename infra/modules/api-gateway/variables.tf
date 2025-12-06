variable "product_name" {
  type = string
}

variable "env" {
  type = string
}

variable "lambda_arn" {
  type = string
}

variable "authorizer_issuer" {
  type = string
}

variable "authorizer_audience" {
  type = string
}

# Where the frontend is hosted – used in CORS
variable "cors_origin" {
  type    = string
  default = "https://selfserve.bayareala8s.com"
}
