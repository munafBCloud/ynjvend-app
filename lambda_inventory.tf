data "archive_file" "create_inventory_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/create_inventory.py"
  output_path = "${path.module}/lambda/create_inventory.zip"
}

resource "aws_lambda_function" "create_inventory" {
  function_name = "${var.project_name}-${var.environment}-create-inventory"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "create_inventory.handler"
  runtime       = "python3.13"

  filename         = data.archive_file.create_inventory_zip.output_path
  source_code_hash = data.archive_file.create_inventory_zip.output_base64sha256

  environment {
    variables = {
      INVENTORY_TABLE_NAME = aws_dynamodb_table.inventory.name
    }
  }
}

data "archive_file" "get_inventory_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/get_inventory.py"
  output_path = "${path.module}/lambda/get_inventory.zip"
}

resource "aws_lambda_function" "get_inventory" {
  function_name = "${var.project_name}-${var.environment}-get-inventory"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "get_inventory.lambda_handler"
  runtime       = "python3.13"

  filename         = data.archive_file.get_inventory_zip.output_path
  source_code_hash = data.archive_file.get_inventory_zip.output_base64sha256

  environment {
    variables = {
      INVENTORY_TABLE_NAME = aws_dynamodb_table.inventory.name
    }
  }
}

data "archive_file" "get_public_inventory_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/get_public_inventory.py"
  output_path = "${path.module}/lambda/get_public_inventory.zip"
}

resource "aws_lambda_function" "get_public_inventory" {
  function_name = "${var.project_name}-${var.environment}-get-public-inventory"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "get_public_inventory.lambda_handler"
  runtime       = "python3.13"

  filename         = data.archive_file.get_public_inventory_zip.output_path
  source_code_hash = data.archive_file.get_public_inventory_zip.output_base64sha256

  environment {
    variables = {
      INVENTORY_TABLE_NAME = aws_dynamodb_table.inventory.name
    }
  }
}

data "archive_file" "update_inventory_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/update_inventory.py"
  output_path = "${path.module}/lambda/update_inventory.zip"
}

resource "aws_lambda_function" "update_inventory" {
  function_name = "${var.project_name}-${var.environment}-update-inventory"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "update_inventory.lambda_handler"
  runtime       = "python3.13"

  filename         = data.archive_file.update_inventory_zip.output_path
  source_code_hash = data.archive_file.update_inventory_zip.output_base64sha256

  environment {
    variables = {
      INVENTORY_TABLE_NAME = aws_dynamodb_table.inventory.name
    }
  }
}

data "archive_file" "delete_inventory_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/delete_inventory.py"
  output_path = "${path.module}/lambda/delete_inventory.zip"
}

resource "aws_lambda_function" "delete_inventory" {
  function_name = "${var.project_name}-${var.environment}-delete-inventory"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "delete_inventory.lambda_handler"
  runtime       = "python3.13"

  filename         = data.archive_file.delete_inventory_zip.output_path
  source_code_hash = data.archive_file.delete_inventory_zip.output_base64sha256

  environment {
    variables = {
      INVENTORY_TABLE_NAME = aws_dynamodb_table.inventory.name
    }
  }
}
