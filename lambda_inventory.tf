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
