# =========================================================
# DYNAMODB RESILIENCE / PROTECTION
# =========================================================
#
# Point-in-time recovery is enabled in every environment so
# accidental item deletion, bad writes, and data corruption
# can be recovered without making development infrastructure
# difficult to intentionally recreate.
#
# Table deletion protection remains production-only so DEV
# and TEST infrastructure can still be intentionally replaced
# or destroyed through Terraform when necessary.
# =========================================================

locals {
  dynamodb_pitr_enabled = contains(
    ["dev", "test", "prod"],
    var.environment
  )

  dynamodb_deletion_protection_enabled = (
    var.environment == "prod"
  )
}
