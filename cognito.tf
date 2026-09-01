resource "aws_cognito_user_pool" "ynj_users" {
  name = "${var.project_name}-${var.environment}-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  schema {
    name                     = "companyId"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 128
    }
  }

  schema {
    name                     = "role"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 32
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_cognito_user_pool_client" "owner_portal" {
  name         = "${var.project_name}-${var.environment}-owner-portal"
  user_pool_id = aws_cognito_user_pool.ynj_users.id

  generate_secret = false

  # Security boundary:
  # companyId and role are authorization claims assigned by administrators.
  # Portal users may read these attributes but must never modify them.
  read_attributes = [
    "email",
    "email_verified",
    "custom:companyId",
    "custom:role",
  ]

  write_attributes = [
    "email",
  ]

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 7

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  enable_token_revocation = true
}

resource "aws_cognito_user_group" "admins" {
  name         = "Admins"
  description  = "YNJ Vend administrators with full owner portal access"
  user_pool_id = aws_cognito_user_pool.ynj_users.id
  precedence   = 1
}

resource "aws_cognito_user_group" "employees" {
  name         = "Employees"
  description  = "YNJ Vend employees with standard operational access"
  user_pool_id = aws_cognito_user_pool.ynj_users.id
  precedence   = 10
}
