resource "aws_lambda_function" "create_customer" {
  function_name = "${var.project_name}-${var.environment}-create-customer"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "create_customer.lambda_handler"

  filename = "lambda/create_customer.zip"

  source_code_hash = filebase64sha256("lambda/create_customer.zip")

  environment {
    variables = {
      CUSTOMERS_TABLE = aws_dynamodb_table.customers.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_lambda_function" "get_customers" {
  function_name = "${var.project_name}-${var.environment}-get-customers"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "get_customers.lambda_handler"

  filename = "lambda/get_customers.zip"

  source_code_hash = filebase64sha256("lambda/get_customers.zip")

  environment {
    variables = {
      CUSTOMERS_TABLE = aws_dynamodb_table.customers.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}
