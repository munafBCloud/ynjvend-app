# =========================================================
# Distro'Dex Founding Beta Applications
# =========================================================

resource "aws_dynamodb_table" "beta_applications" {
  deletion_protection_enabled = local.dynamodb_deletion_protection_enabled

  point_in_time_recovery {
    enabled = local.dynamodb_pitr_enabled
  }

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

  role    = aws_iam_role.lambda_beta_applications_role.arn
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

  depends_on = [
    aws_iam_role_policy.lambda_beta_applications_permissions,
    aws_iam_role_policy_attachment.lambda_beta_applications_basic_execution,
  ]
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


# =========================================================
# Distro'Dex Founding Beta Provisioning
#
# Administrative invocation only.
# Intentionally has no API Gateway route.
# =========================================================

resource "aws_lambda_function" "provision_beta_application" {
  function_name = "${var.project_name}-${var.environment}-provision-beta-application"

  role    = aws_iam_role.lambda_beta_provisioning_role.arn
  runtime = "python3.13"
  handler = "provision_beta_application.lambda_handler"

  filename         = "backend/beta_applications/provision_beta_application.zip"
  source_code_hash = filebase64sha256("backend/beta_applications/provision_beta_application.zip")

  timeout     = 15
  memory_size = 128

  environment {
    variables = {
      BETA_APPLICATIONS_TABLE = aws_dynamodb_table.beta_applications.name
      COMPANIES_TABLE         = aws_dynamodb_table.companies.name
      COGNITO_USER_POOL_ID    = aws_cognito_user_pool.ynj_users.id
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "BetaProvisioning"
  }

  depends_on = [
    aws_iam_role_policy.lambda_beta_provisioning_permissions,
    aws_iam_role_policy_attachment.lambda_beta_provisioning_basic_execution,
  ]
}


# =========================================================
# DistroDex Platform Admin - Beta Application Read API
#
# Internal read-only endpoint. API Gateway validates tokens
# issued for the dedicated admin portal client. The Lambda
# additionally requires PlatformAdmins Cognito membership.
# =========================================================

resource "aws_lambda_function" "admin_get_beta_applications" {
  function_name = "${var.project_name}-${var.environment}-admin-get-beta-applications"

  role    = aws_iam_role.lambda_platform_admin_read_role.arn
  runtime = "python3.13"
  handler = "get_beta_applications.lambda_handler"

  filename         = "backend/admin/get_beta_applications.zip"
  source_code_hash = filebase64sha256("backend/admin/get_beta_applications.zip")

  timeout     = 10
  memory_size = 128

  environment {
    variables = {
      BETA_APPLICATIONS_TABLE = aws_dynamodb_table.beta_applications.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "PlatformAdminRead"
  }

  depends_on = [
    aws_iam_role_policy.lambda_platform_admin_read_permissions,
    aws_iam_role_policy_attachment.lambda_platform_admin_read_basic_execution,
  ]
}

resource "aws_apigatewayv2_integration" "admin_get_beta_applications" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin_get_beta_applications.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "admin_get_beta_applications" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "GET /admin/beta-applications"
  target    = "integrations/${aws_apigatewayv2_integration.admin_get_beta_applications.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin_cognito_jwt.id
}

resource "aws_lambda_permission" "allow_admin_get_beta_applications_api_gateway" {
  statement_id = "AllowAdminGetBetaApplicationsFromAPIGateway"

  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_get_beta_applications.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/GET/admin/beta-applications"
}


# Platform admin detail lookup for one beta application.
# Uses the same read-only Lambda and JWT authorization boundary
# as the beta application collection endpoint.
resource "aws_apigatewayv2_route" "admin_get_beta_application" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "GET /admin/beta-applications/{applicationId}"
  target    = "integrations/${aws_apigatewayv2_integration.admin_get_beta_applications.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin_cognito_jwt.id
}

resource "aws_lambda_permission" "allow_admin_get_beta_application_api_gateway" {
  statement_id = "AllowAdminGetBetaApplicationFromAPIGateway"

  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_get_beta_applications.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/GET/admin/beta-applications/*"
}


# =========================================================
# Platform admin beta application approval
# =========================================================

resource "aws_lambda_function" "admin_approve_beta_application" {
  function_name = "${var.project_name}-${var.environment}-admin-approve-beta-application"
  role          = aws_iam_role.lambda_platform_admin_approval.arn

  runtime = "python3.13"
  handler = "approve_beta_application.lambda_handler"

  filename = "${path.module}/backend/admin/approve_beta_application.zip"

  source_code_hash = filebase64sha256(
    "${path.module}/backend/admin/approve_beta_application.zip"
  )

  timeout     = 30
  memory_size = 128

  environment {
    variables = {
      BETA_APPLICATIONS_TABLE    = aws_dynamodb_table.beta_applications.name
      PROVISIONING_FUNCTION_NAME = aws_lambda_function.provision_beta_application.function_name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Purpose     = "Platform admin beta application approval"
  }
}

resource "aws_apigatewayv2_integration" "admin_approve_beta_application" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin_approve_beta_application.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "admin_approve_beta_application" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "POST /admin/beta-applications/{applicationId}/approve"
  target    = "integrations/${aws_apigatewayv2_integration.admin_approve_beta_application.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.admin_cognito_jwt.id
}

resource "aws_lambda_permission" "allow_admin_approve_beta_application_api_gateway" {
  statement_id = "AllowAdminApproveBetaApplicationFromAPIGateway"

  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_approve_beta_application.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/POST/admin/beta-applications/*/approve"
}
