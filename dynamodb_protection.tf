# =========================================================
# DYNAMODB RESILIENCE / PROTECTION
# =========================================================

locals {
  dynamodb_pitr_enabled = contains(
    ["test", "prod"],
    var.environment
  )

  dynamodb_deletion_protection_enabled = (
    var.environment == "prod"
  )
}
