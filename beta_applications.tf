# =========================================================
# Distro'Dex Founding Beta Applications
# =========================================================

resource "aws_dynamodb_table" "beta_applications" {
  name         = "${var.project_name}-${var.environment}-beta-applications"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "applicationId"

  attribute {
    name = "applicationId"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Purpose     = "DistroDex Founding Beta Applications"
  }
}


resource "aws_lambda_function" "create_beta_application" {
  function_name = "${var.project_name}-${var.environment}-create-beta-application"

  role    = aws_iam_role.lambda_execution_role.arn
  runtime = "python3.13"
  handler = "create_beta_application.lambda_handler"

  filename         = "backend/beta_applications/create_beta_application.zip"
  source_code_hash = filebase64sha256("backend/beta_applications/create_beta_application.zip")

  timeout     = 10
  memory_size = 128

  environment {
    variables = {
      BETA_APPLICATIONS_TABLE = aws_dynamodb_table.beta_applications.name
      NOTIFICATION_FROM_EMAIL = var.beta_notification_from_email
      NOTIFICATION_TO_EMAIL   = var.beta_notification_to_email
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}


resource "aws_apigatewayv2_integration" "create_beta_application_integration" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_beta_application.invoke_arn
  payload_format_version = "2.0"
}


resource "aws_apigatewayv2_route" "create_beta_application_route" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "POST /beta-applications"
  target    = "integrations/${aws_apigatewayv2_integration.create_beta_application_integration.id}"
}


resource "aws_lambda_permission" "allow_create_beta_application_api_gateway" {
  statement_id  = "AllowCreateBetaApplicationFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_beta_application.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*/beta-applications"
}
