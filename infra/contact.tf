# The contact form's endpoint: functions/contact/lambda.ts behind a public function URL, storing
# enquiries in DynamoDB and emailing through SES. The form posts to the function URL directly:
# putting it behind CloudFront with OAC would need the browser to sign the body, which a plain
# HTML form can't.

resource "aws_dynamodb_table" "enquiries" {
  name         = "portfolio-enquiries"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# Created here rather than by Lambda, which would keep the logs forever
resource "aws_cloudwatch_log_group" "contact" {
  name              = "/aws/lambda/portfolio-contact"
  retention_in_days = 30
}

data "aws_iam_policy_document" "contact_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "contact" {
  name               = "portfolio-contact"
  assume_role_policy = data.aws_iam_policy_document.contact_assume.json
}

data "aws_iam_policy_document" "contact" {
  statement {
    actions   = ["dynamodb:PutItem"]
    resources = [aws_dynamodb_table.enquiries.arn]
  }

  # Every identity, not just the domain: in the SES sandbox, sending also needs permission on the
  # (verified) recipient's identity
  statement {
    actions   = ["ses:SendEmail"]
    resources = ["arn:aws:ses:${var.region}:${data.aws_caller_identity.current.account_id}:identity/*"]
  }

  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.contact.arn}:*"]
  }
}

resource "aws_iam_role_policy" "contact" {
  name   = "portfolio-contact"
  role   = aws_iam_role.contact.id
  policy = data.aws_iam_policy_document.contact.json
}

# Terraform creates the function with this stand-in, which sends everyone to the error page, and
# scripts/deploy.sh uploads the real code (npm run build:lambda). ignore_changes below stops a
# later apply from putting the stand-in back.
data "archive_file" "contact_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.build/contact-placeholder.zip"

  source {
    filename = "index.mjs"
    content  = "export const handler = async () => ({ statusCode: 303, headers: { Location: 'https://${var.domain}/contact/error/' } });\n"
  }
}

resource "aws_lambda_function" "contact" {
  function_name = "portfolio-contact"
  role          = aws_iam_role.contact.arn
  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 256
  timeout       = 10

  filename         = data.archive_file.contact_placeholder.output_path
  source_code_hash = data.archive_file.contact_placeholder.output_base64sha256

  reserved_concurrent_executions = var.contact_concurrency

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.enquiries.name
      SITE_URL    = "https://${var.domain}"
      OWNER_EMAIL = var.owner_email
      FROM_EMAIL  = var.from_email
    }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.contact.name
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_iam_role_policy.contact]
}

resource "aws_lambda_function_url" "contact" {
  function_name      = aws_lambda_function.contact.function_name
  authorization_type = "NONE"
}

# A public function URL needs two grants to everyone: InvokeFunctionUrl, and (since late 2025)
# InvokeFunction limited to calls that come through the URL
resource "aws_lambda_permission" "contact_url" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.contact.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "contact_invoke" {
  statement_id             = "FunctionURLAllowInvokeAction"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.contact.function_name
  principal                = "*"
  invoked_via_function_url = true
}
