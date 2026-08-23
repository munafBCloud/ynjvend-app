resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name = "${var.project_name}-${var.environment}-lambda-dynamodb-access"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:TransactWriteItems"
        ]
        Resource = [
          aws_dynamodb_table.companies.arn,
          aws_dynamodb_table.customers_v2.arn,
          aws_dynamodb_table.inventory_v2.arn,
          aws_dynamodb_table.barcode_registry.arn,
          aws_dynamodb_table.orders_v2.arn,
          aws_dynamodb_table.invoices.arn,
          aws_dynamodb_table.beta_applications.arn,

        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}


# Distro'Dex beta application notification email
resource "aws_iam_role_policy" "lambda_ses_send_email" {
  name = "${var.project_name}-${var.environment}-lambda-ses-send-email"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "ses:SendEmail"
        ]

        Resource = "*"
      }
    ]
  })
}
