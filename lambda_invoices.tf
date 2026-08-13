resource "aws_lambda_function" "create_invoice" {
  function_name = "${var.project_name}-${var.environment}-create-invoice"

  role    = aws_iam_role.lambda_execution_role.arn
  runtime = "python3.13"
  handler = "create_invoice.lambda_handler"

  filename         = "backend/create_invoice/create_invoice.zip"
  source_code_hash = filebase64sha256("backend/create_invoice/create_invoice.zip")

  timeout     = 15
  memory_size = 256

  environment {
    variables = {
      INVOICES_TABLE = aws_dynamodb_table.invoices.name
      ORDERS_TABLE   = aws_dynamodb_table.orders_v2.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_lambda_function" "get_invoices" {
  function_name = "${var.project_name}-${var.environment}-get-invoices"

  role    = aws_iam_role.lambda_execution_role.arn
  runtime = "python3.13"
  handler = "get_invoices.lambda_handler"

  filename         = "backend/get_invoices/get_invoices.zip"
  source_code_hash = filebase64sha256("backend/get_invoices/get_invoices.zip")

  timeout     = 15
  memory_size = 256

  environment {
    variables = {
      INVOICES_TABLE = aws_dynamodb_table.invoices.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_lambda_function" "update_invoice" {
  function_name = "${var.project_name}-${var.environment}-update-invoice"

  role    = aws_iam_role.lambda_execution_role.arn
  runtime = "python3.13"
  handler = "update_invoice.lambda_handler"

  filename         = "backend/update_invoice/update_invoice.zip"
  source_code_hash = filebase64sha256("backend/update_invoice/update_invoice.zip")

  timeout     = 15
  memory_size = 256

  environment {
    variables = {
      INVOICES_TABLE = aws_dynamodb_table.invoices.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}
