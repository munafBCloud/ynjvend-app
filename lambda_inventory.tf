resource "aws_lambda_function" "create_inventory" {
  function_name = "${var.project_name}-${var.environment}-create-inventory"
  role          = aws_iam_role.lambda_inventory_role.arn
  runtime       = "python3.13"
  handler       = "create_inventory.handler"

  filename         = "lambda/create_inventory.zip"
  source_code_hash = filebase64sha256("lambda/create_inventory.zip")

  environment {
    variables = {
      INVENTORY_TABLE_NAME   = aws_dynamodb_table.inventory_v2.name
      BARCODE_REGISTRY_TABLE = aws_dynamodb_table.barcode_registry.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_inventory_dynamodb,
    aws_iam_role_policy_attachment.lambda_inventory_basic_execution,
  ]
}

resource "aws_lambda_function" "get_inventory" {
  function_name = "${var.project_name}-${var.environment}-get-inventory"
  role          = aws_iam_role.lambda_inventory_role.arn
  runtime       = "python3.13"
  handler       = "get_inventory.lambda_handler"

  filename         = "lambda/get_inventory.zip"
  source_code_hash = filebase64sha256("lambda/get_inventory.zip")

  environment {
    variables = {
      INVENTORY_TABLE_NAME = aws_dynamodb_table.inventory_v2.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_inventory_dynamodb,
    aws_iam_role_policy_attachment.lambda_inventory_basic_execution,
  ]
}

resource "aws_lambda_function" "update_inventory" {
  function_name = "${var.project_name}-${var.environment}-update-inventory"
  role          = aws_iam_role.lambda_inventory_role.arn
  runtime       = "python3.13"
  handler       = "update_inventory.lambda_handler"

  filename         = "lambda/update_inventory.zip"
  source_code_hash = filebase64sha256("lambda/update_inventory.zip")

  environment {
    variables = {
      INVENTORY_TABLE_NAME   = aws_dynamodb_table.inventory_v2.name
      BARCODE_REGISTRY_TABLE = aws_dynamodb_table.barcode_registry.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_inventory_dynamodb,
    aws_iam_role_policy_attachment.lambda_inventory_basic_execution,
  ]
}

resource "aws_lambda_function" "delete_inventory" {
  function_name = "${var.project_name}-${var.environment}-delete-inventory"
  role          = aws_iam_role.lambda_inventory_role.arn
  runtime       = "python3.13"
  handler       = "delete_inventory.lambda_handler"

  filename         = "lambda/delete_inventory.zip"
  source_code_hash = filebase64sha256("lambda/delete_inventory.zip")

  environment {
    variables = {
      INVENTORY_TABLE_NAME   = aws_dynamodb_table.inventory_v2.name
      BARCODE_REGISTRY_TABLE = aws_dynamodb_table.barcode_registry.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_inventory_dynamodb,
    aws_iam_role_policy_attachment.lambda_inventory_basic_execution,
  ]
}


resource "aws_lambda_function" "get_inventory_by_barcode" {
  function_name = "${var.project_name}-${var.environment}-get-inventory-by-barcode"

  role    = aws_iam_role.lambda_receiving_role.arn
  runtime = "python3.13"
  handler = "get_inventory_by_barcode.lambda_handler"

  filename         = "lambda/get_inventory_by_barcode.zip"
  source_code_hash = filebase64sha256("lambda/get_inventory_by_barcode.zip")

  environment {
    variables = {
      INVENTORY_TABLE_NAME   = aws_dynamodb_table.inventory_v2.name
      BARCODE_REGISTRY_TABLE = aws_dynamodb_table.barcode_registry.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_receiving_dynamodb,
    aws_iam_role_policy_attachment.lambda_receiving_basic_execution,
  ]
}


resource "aws_lambda_function" "receive_inventory" {
  function_name = "${var.project_name}-${var.environment}-receive-inventory"

  role    = aws_iam_role.lambda_receiving_role.arn
  runtime = "python3.13"
  handler = "receive_inventory.lambda_handler"

  filename         = "lambda/receive_inventory.zip"
  source_code_hash = filebase64sha256("lambda/receive_inventory.zip")

  environment {
    variables = {
      INVENTORY_TABLE_NAME               = aws_dynamodb_table.inventory_v2.name
      BARCODE_REGISTRY_TABLE             = aws_dynamodb_table.barcode_registry.name
      INVENTORY_RECEIPTS_TABLE           = aws_dynamodb_table.inventory_receipts.name
      INVENTORY_RECEIVING_SESSIONS_TABLE = aws_dynamodb_table.inventory_receiving_sessions.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_receiving_dynamodb,
    aws_iam_role_policy_attachment.lambda_receiving_basic_execution,
  ]
}


resource "aws_lambda_function" "create_receiving_session" {
  function_name = "${var.project_name}-${var.environment}-create-receiving-session"

  role    = aws_iam_role.lambda_receiving_role.arn
  runtime = "python3.13"
  handler = "create_receiving_session.lambda_handler"

  filename         = "lambda/create_receiving_session.zip"
  source_code_hash = filebase64sha256("lambda/create_receiving_session.zip")

  environment {
    variables = {
      INVENTORY_RECEIVING_SESSIONS_TABLE = aws_dynamodb_table.inventory_receiving_sessions.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_receiving_dynamodb,
    aws_iam_role_policy_attachment.lambda_receiving_basic_execution,
  ]
}


resource "aws_lambda_function" "complete_receiving_session" {
  function_name = "${var.project_name}-${var.environment}-complete-receiving-session"

  role    = aws_iam_role.lambda_receiving_role.arn
  runtime = "python3.13"
  handler = "complete_receiving_session.lambda_handler"

  filename         = "lambda/complete_receiving_session.zip"
  source_code_hash = filebase64sha256("lambda/complete_receiving_session.zip")

  environment {
    variables = {
      INVENTORY_RECEIVING_SESSIONS_TABLE = aws_dynamodb_table.inventory_receiving_sessions.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_receiving_dynamodb,
    aws_iam_role_policy_attachment.lambda_receiving_basic_execution,
  ]
}
