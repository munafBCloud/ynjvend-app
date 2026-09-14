# ============================================================
# COMPANY PROFILE / ONBOARDING
# ============================================================

resource "aws_lambda_function" "get_company" {
  function_name = "${var.project_name}-${var.environment}-get-company"

  role = aws_iam_role.lambda_company_role.arn

  runtime = "python3.13"
  handler = "get_company.lambda_handler"

  filename         = "backend/company/get_company.zip"
  source_code_hash = filebase64sha256("backend/company/get_company.zip")

  timeout     = 10
  memory_size = 128

  environment {
    variables = {
      COMPANIES_TABLE = aws_dynamodb_table.companies.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Company"
  }

  depends_on = [
    aws_iam_role_policy.lambda_company_dynamodb,
    aws_iam_role_policy_attachment.lambda_company_basic_execution,
  ]
}


resource "aws_lambda_function" "update_company_onboarding" {
  function_name = "${var.project_name}-${var.environment}-update-company-onboarding"

  role = aws_iam_role.lambda_company_role.arn

  runtime = "python3.13"
  handler = "update_company_onboarding.lambda_handler"

  filename         = "backend/company/update_company_onboarding.zip"
  source_code_hash = filebase64sha256("backend/company/update_company_onboarding.zip")

  timeout     = 10
  memory_size = 128

  environment {
    variables = {
      COMPANIES_TABLE = aws_dynamodb_table.companies.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Company"
  }

  depends_on = [
    aws_iam_role_policy.lambda_company_dynamodb,
    aws_iam_role_policy_attachment.lambda_company_basic_execution,
  ]
}
