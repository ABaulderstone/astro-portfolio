# What scripts/deploy.sh and the build need. `terraform output` lists them; the deploy job gets the
# same values as GitHub environment variables.

output "site_bucket" {
  value = aws_s3_bucket.site.id
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "contact_function" {
  value = aws_lambda_function.contact.function_name
}

output "contact_endpoint" {
  description = "PUBLIC_CONTACT_ENDPOINT for the build"
  value       = aws_lambda_function_url.contact.function_url
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}
