# State lives in an S3 bucket created once by hand (notes/aws-setup.md, step 2). use_lockfile locks
# with S3 itself, so no DynamoDB lock table is needed.
terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  backend "s3" {
    bucket       = "alexbaulderstone-tfstate"
    key          = "portfolio/terraform.tfstate"
    region       = "ap-southeast-2"
    use_lockfile = true
  }
}
