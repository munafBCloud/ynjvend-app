resource "aws_dynamodb_table" "invoices" {
  name         = "${var.project_name}-${var.environment}-invoices"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "companyId"
  range_key = "invoiceId"

  attribute {
    name = "companyId"
    type = "S"
  }

  attribute {
    name = "invoiceId"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}
