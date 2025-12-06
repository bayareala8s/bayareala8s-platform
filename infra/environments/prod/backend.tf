terraform {
  backend "s3" {
    bucket         = "bayareala8s-terraform-state"        # your bucket name
    key            = "bayserve-v2/prod/terraform.tfstate" # path within the bucket
    region         = "us-west-2"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
