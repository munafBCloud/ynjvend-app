resource "aws_lambda_function" "create_request" {
  function_name = "${var.project_name}-${var.environment}-create-request"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "create_request.lambda_handler"

  filename = "lambda/create_request.zip"

  source_code_hash = filebase64sha256("lambda/create_request.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_lambda_function" "get_requests" {
  function_name = "${var.project_name}-${var.environment}-get-requests"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "get_requests.lambda_handler"

  filename = "lambda/get_requests.zip"

  source_code_hash = filebase64sha256("lambda/get_requests.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_lambda_function" "update_request" {
  function_name = "${var.project_name}-${var.environment}-update-request"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "update_request.lambda_handler"

  filename = "lambda/update_request.zip"

  source_code_hash = filebase64sha256("lambda/update_request.zip")

  environment {
    variables = {
      REQUESTS_TABLE = aws_dynamodb_table.requests.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}
