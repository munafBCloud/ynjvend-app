resource "aws_lambda_function" "create_order" {
  function_name = "${var.project_name}-${var.environment}-create-order"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "create_order.lambda_handler"

  filename = "lambda/create_order.zip"

  source_code_hash = filebase64sha256("lambda/create_order.zip")

  environment {
    variables = {
      ORDERS_TABLE    = aws_dynamodb_table.orders.name
      CUSTOMERS_TABLE = aws_dynamodb_table.customers.name
      INVENTORY_TABLE = aws_dynamodb_table.inventory.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_lambda_function" "get_orders" {
  function_name = "${var.project_name}-${var.environment}-get-orders"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "get_orders.lambda_handler"

  filename = "lambda/get_orders.zip"

  source_code_hash = filebase64sha256("lambda/get_orders.zip")

  environment {
    variables = {
      ORDERS_TABLE = aws_dynamodb_table.orders.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_lambda_function" "update_order" {
  function_name = "${var.project_name}-${var.environment}-update-order"

  role = aws_iam_role.lambda_execution_role.arn

  runtime = "python3.13"
  handler = "update_order.lambda_handler"

  filename = "lambda/update_order.zip"

  source_code_hash = filebase64sha256("lambda/update_order.zip")

  environment {
    variables = {
      ORDERS_TABLE    = aws_dynamodb_table.orders.name
      INVENTORY_TABLE = aws_dynamodb_table.inventory.name
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}
