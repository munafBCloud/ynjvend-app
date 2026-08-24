resource "aws_dynamodb_table" "companies" {
  deletion_protection_enabled = local.dynamodb_deletion_protection_enabled

  point_in_time_recovery {
    enabled = local.dynamodb_pitr_enabled
  }

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
  deletion_protection_enabled = local.dynamodb_deletion_protection_enabled

  point_in_time_recovery {
    enabled = local.dynamodb_pitr_enabled
  }

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
  deletion_protection_enabled = local.dynamodb_deletion_protection_enabled

  point_in_time_recovery {
    enabled = local.dynamodb_pitr_enabled
  }

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
  deletion_protection_enabled = local.dynamodb_deletion_protection_enabled

  point_in_time_recovery {
    enabled = local.dynamodb_pitr_enabled
  }

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


# ---------------------------------------------------------
# Barcode Registry
#
# Provides a tenant-scoped one-to-one mapping:
#
#   companyId + barcode -> productId
#
# This prevents two inventory products within the same
# company from claiming the same barcode while allowing
# different companies to use the same manufacturer barcode.
# ---------------------------------------------------------

resource "aws_dynamodb_table" "barcode_registry" {
  deletion_protection_enabled = local.dynamodb_deletion_protection_enabled

  point_in_time_recovery {
    enabled = local.dynamodb_pitr_enabled
  }

  name         = "${var.project_name}-${var.environment}-barcode-registry"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "companyId"
  range_key = "barcode"

  attribute {
    name = "companyId"
    type = "S"
  }

  attribute {
    name = "barcode"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}


# =========================================================
# INVENTORY RECEIPTS
# Immutable tenant-aware inventory receiving audit records
# =========================================================

resource "aws_dynamodb_table" "inventory_receipts" {
  deletion_protection_enabled = local.dynamodb_deletion_protection_enabled

  point_in_time_recovery {
    enabled = local.dynamodb_pitr_enabled
  }

  name         = "${var.project_name}-${var.environment}-inventory-receipts"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "companyId"
  range_key = "receiptId"

  attribute {
    name = "companyId"
    type = "S"
  }

  attribute {
    name = "receiptId"
    type = "S"
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}
