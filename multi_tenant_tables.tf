resource "aws_dynamodb_table" "companies" {
  name         = "${var.project_name}-${var.environment}-companies"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "companyId"

  attribute {
    name = "companyId"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_dynamodb_table" "customers_v2" {
  name         = "${var.project_name}-${var.environment}-customers-v2"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "companyId"
  range_key    = "customerId"

  attribute {
    name = "companyId"
    type = "S"
  }

  attribute {
    name = "customerId"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_dynamodb_table" "inventory_v2" {
  name         = "${var.project_name}-${var.environment}-inventory-v2"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "companyId"
  range_key    = "productId"

  attribute {
    name = "companyId"
    type = "S"
  }

  attribute {
    name = "productId"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

resource "aws_dynamodb_table" "orders_v2" {
  name         = "${var.project_name}-${var.environment}-orders-v2"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "companyId"
  range_key    = "orderId"

  attribute {
    name = "companyId"
    type = "S"
  }

  attribute {
    name = "orderId"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}
