# ============================================================
# Distro'Dex Lambda least-privilege execution roles
#
# Migration strategy:
# - Active Lambda functions move away from the legacy shared role.
# - The legacy shared role remains temporarily during validation.
# - Remove the legacy role/policies only after DEV regression passes.
# ============================================================

data "aws_iam_policy_document" "lambda_workload_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# ------------------------------------------------------------
# CUSTOMER WORKLOAD
# create/get/update/delete customer Lambdas
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_customers_role" {
  name               = "${var.project_name}-${var.environment}-lambda-customers-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Customers"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_customers_basic_execution" {
  role       = aws_iam_role.lambda_customers_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_customers_dynamodb" {
  statement {
    sid    = "CustomerTableAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]

    resources = [
      aws_dynamodb_table.customers_v2.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_customers_dynamodb" {
  name   = "${var.project_name}-${var.environment}-lambda-customers-dynamodb"
  role   = aws_iam_role.lambda_customers_role.id
  policy = data.aws_iam_policy_document.lambda_customers_dynamodb.json
}

# ------------------------------------------------------------
# INVENTORY WORKLOAD
# create/get/update/delete inventory Lambdas
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_inventory_role" {
  name               = "${var.project_name}-${var.environment}-lambda-inventory-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Inventory"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_inventory_basic_execution" {
  role       = aws_iam_role.lambda_inventory_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_inventory_dynamodb" {
  statement {
    sid    = "InventoryDirectAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]

    resources = [
      aws_dynamodb_table.inventory_v2.arn,
    ]
  }

  statement {
    sid    = "InventoryBarcodeTransactionAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:TransactWriteItems",
    ]

    resources = [
      aws_dynamodb_table.inventory_v2.arn,
      aws_dynamodb_table.barcode_registry.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_inventory_dynamodb" {
  name   = "${var.project_name}-${var.environment}-lambda-inventory-dynamodb"
  role   = aws_iam_role.lambda_inventory_role.id
  policy = data.aws_iam_policy_document.lambda_inventory_dynamodb.json
}

# ------------------------------------------------------------
# RECEIVING WORKLOAD
# barcode lookup / receive / receiving sessions
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_receiving_role" {
  name               = "${var.project_name}-${var.environment}-lambda-receiving-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Receiving"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_receiving_basic_execution" {
  role       = aws_iam_role.lambda_receiving_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_receiving_dynamodb" {
  statement {
    sid    = "ReceivingReadAccess"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
    ]

    resources = [
      aws_dynamodb_table.inventory_v2.arn,
      aws_dynamodb_table.barcode_registry.arn,
      aws_dynamodb_table.inventory_receiving_sessions.arn,
    ]
  }

  statement {
    sid    = "ReceivingBarcodeConditionCheckAccess"
    effect = "Allow"

    actions = [
      "dynamodb:ConditionCheckItem",
    ]

    resources = [
      aws_dynamodb_table.barcode_registry.arn,
    ]
  }

  statement {
    sid    = "ReceivingInventoryUpdateAccess"
    effect = "Allow"

    actions = [
      "dynamodb:UpdateItem",
    ]

    resources = [
      aws_dynamodb_table.inventory_v2.arn,
    ]
  }

  statement {
    sid    = "ReceivingReceiptCreateAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
    ]

    resources = [
      aws_dynamodb_table.inventory_receipts.arn,
    ]
  }

  statement {
    sid    = "ReceivingSessionCreateAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
    ]

    resources = [
      aws_dynamodb_table.inventory_receiving_sessions.arn,
    ]
  }

  statement {
    sid    = "ReceivingSessionUpdateAccess"
    effect = "Allow"

    actions = [
      "dynamodb:UpdateItem",
    ]

    resources = [
      aws_dynamodb_table.inventory_receiving_sessions.arn,
    ]
  }

  statement {
    sid    = "ReceivingTransactionAccess"
    effect = "Allow"

    actions = [
      "dynamodb:TransactWriteItems",
    ]

    resources = [
      aws_dynamodb_table.inventory_v2.arn,
      aws_dynamodb_table.inventory_receipts.arn,
      aws_dynamodb_table.inventory_receiving_sessions.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_receiving_dynamodb" {
  name   = "${var.project_name}-${var.environment}-lambda-receiving-dynamodb"
  role   = aws_iam_role.lambda_receiving_role.id
  policy = data.aws_iam_policy_document.lambda_receiving_dynamodb.json
}

# ------------------------------------------------------------
# ORDER WORKLOAD
# create/get/update order Lambdas
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_orders_role" {
  name               = "${var.project_name}-${var.environment}-lambda-orders-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Orders"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_orders_basic_execution" {
  role       = aws_iam_role.lambda_orders_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_orders_dynamodb" {
  statement {
    sid    = "OrdersTableAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:TransactWriteItems",
    ]

    resources = [
      aws_dynamodb_table.orders_v2.arn,
    ]
  }

  statement {
    sid    = "OrderCustomerReadAccess"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
    ]

    resources = [
      aws_dynamodb_table.customers_v2.arn,
    ]
  }

  statement {
    sid    = "OrderInventoryAccess"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:TransactWriteItems",
    ]

    resources = [
      aws_dynamodb_table.inventory_v2.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_orders_dynamodb" {
  name   = "${var.project_name}-${var.environment}-lambda-orders-dynamodb"
  role   = aws_iam_role.lambda_orders_role.id
  policy = data.aws_iam_policy_document.lambda_orders_dynamodb.json
}

# ------------------------------------------------------------
# INVOICE WORKLOAD
# create/get/update invoice Lambdas
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_invoices_role" {
  name               = "${var.project_name}-${var.environment}-lambda-invoices-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Invoices"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_invoices_basic_execution" {
  role       = aws_iam_role.lambda_invoices_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_invoices_dynamodb" {
  statement {
    sid    = "InvoicesTableAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ]

    resources = [
      aws_dynamodb_table.invoices.arn,
    ]
  }

  statement {
    sid    = "InvoiceOrderReadAccess"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
    ]

    resources = [
      aws_dynamodb_table.orders_v2.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_invoices_dynamodb" {
  name   = "${var.project_name}-${var.environment}-lambda-invoices-dynamodb"
  role   = aws_iam_role.lambda_invoices_role.id
  policy = data.aws_iam_policy_document.lambda_invoices_dynamodb.json
}

# ------------------------------------------------------------
# BETA APPLICATION WORKLOAD
# Only workload permitted to send email.
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_beta_applications_role" {
  name               = "${var.project_name}-${var.environment}-lambda-beta-applications-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "BetaApplications"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_beta_applications_basic_execution" {
  role       = aws_iam_role.lambda_beta_applications_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_beta_applications_permissions" {
  statement {
    sid    = "BetaApplicationWriteAccess"
    effect = "Allow"

    actions = [
      "dynamodb:PutItem",
    ]

    resources = [
      aws_dynamodb_table.beta_applications.arn,
    ]
  }

  # SES is isolated to the beta-application workload.
  # Resource scoping can be tightened to verified identities later.
  statement {
    sid    = "BetaApplicationEmailAccess"
    effect = "Allow"

    actions = [
      "ses:SendEmail",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "lambda_beta_applications_permissions" {
  name   = "${var.project_name}-${var.environment}-lambda-beta-applications"
  role   = aws_iam_role.lambda_beta_applications_role.id
  policy = data.aws_iam_policy_document.lambda_beta_applications_permissions.json
}

# ============================================================
# IAM propagation safeguards
#
# Lambda role changes depend on these policies through explicit
# Lambda resource dependencies added below. This prevents a
# function from switching to a newly-created execution role
# before its logging and workload permissions are attached.
# ============================================================

# ------------------------------------------------------------
# BETA PROVISIONING WORKLOAD
#
# Administrative Founding Beta onboarding only.
# This workload is NOT exposed through API Gateway.
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_beta_provisioning_role" {
  name               = "${var.project_name}-${var.environment}-lambda-beta-provisioning-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "BetaProvisioning"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_beta_provisioning_basic_execution" {
  role       = aws_iam_role.lambda_beta_provisioning_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_beta_provisioning_permissions" {
  statement {
    sid    = "BetaApplicationReadUpdate"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]

    resources = [
      aws_dynamodb_table.beta_applications.arn,
    ]
  }

  statement {
    sid    = "CompanyProvisioningWrite"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
    ]

    resources = [
      aws_dynamodb_table.companies.arn,
    ]
  }

  statement {
    sid    = "CognitoOwnerProvisioning"
    effect = "Allow"

    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminUpdateUserAttributes",
    ]

    resources = [
      aws_cognito_user_pool.ynj_users.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_beta_provisioning_permissions" {
  name   = "${var.project_name}-${var.environment}-lambda-beta-provisioning"
  role   = aws_iam_role.lambda_beta_provisioning_role.id
  policy = data.aws_iam_policy_document.lambda_beta_provisioning_permissions.json
}


# ------------------------------------------------------------
# COMPANY PROFILE WORKLOAD
#
# Authenticated tenant company-profile and onboarding access.
# This workload has no Cognito administrative permissions.
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_company_role" {
  name               = "${var.project_name}-${var.environment}-lambda-company-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "Company"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_company_basic_execution" {
  role       = aws_iam_role.lambda_company_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_company_dynamodb" {
  statement {
    sid    = "CompanyProfileAccess"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]

    resources = [
      aws_dynamodb_table.companies.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_company_dynamodb" {
  name   = "${var.project_name}-${var.environment}-lambda-company-dynamodb"
  role   = aws_iam_role.lambda_company_role.id
  policy = data.aws_iam_policy_document.lambda_company_dynamodb.json
}


# ------------------------------------------------------------
# PLATFORM ADMIN READ WORKLOAD
#
# Read-only access for the internal DistroDex administration
# control plane. This role has no customer workload, SES,
# Cognito administration, or provisioning permissions.
# ------------------------------------------------------------

resource "aws_iam_role" "lambda_platform_admin_read_role" {
  name = "${var.project_name}-${var.environment}-lambda-platform-admin-read-role"

  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "PlatformAdminRead"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_platform_admin_read_basic_execution" {
  role       = aws_iam_role.lambda_platform_admin_read_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_platform_admin_read_permissions" {
  statement {
    sid    = "BetaApplicationReadOnly"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:Scan",
    ]

    resources = [
      aws_dynamodb_table.beta_applications.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_platform_admin_read_permissions" {
  name = "${var.project_name}-${var.environment}-lambda-platform-admin-read"

  role   = aws_iam_role.lambda_platform_admin_read_role.id
  policy = data.aws_iam_policy_document.lambda_platform_admin_read_permissions.json
}


# =========================================================
# Platform admin beta application approval
#
# This Lambda is intentionally orchestration-only:
# - read the requested beta application
# - invoke the existing provisioning Lambda
#
# It must not directly mutate companies or Cognito users.
# =========================================================

resource "aws_iam_role" "lambda_platform_admin_approval" {
  name = "${var.project_name}-${var.environment}-platform-admin-approval-role"

  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json
}

data "aws_iam_policy_document" "lambda_platform_admin_approval_permissions" {
  statement {
    sid    = "ReadBetaApplication"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
    ]

    resources = [
      aws_dynamodb_table.beta_applications.arn,
    ]
  }

  statement {
    sid    = "InvokeBetaProvisioning"
    effect = "Allow"

    actions = [
      "lambda:InvokeFunction",
    ]

    resources = [
      aws_lambda_function.provision_beta_application.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_platform_admin_approval" {
  name = "${var.project_name}-${var.environment}-platform-admin-approval"
  role = aws_iam_role.lambda_platform_admin_approval.id

  policy = data.aws_iam_policy_document.lambda_platform_admin_approval_permissions.json
}

resource "aws_iam_role_policy_attachment" "lambda_platform_admin_approval_basic_execution" {
  role = aws_iam_role.lambda_platform_admin_approval.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}


# =========================================================
# PLATFORM ADMIN COMPANY READ WORKLOAD
#
# Internal read-only access to the DistroDex company
# registry. No customer workload mutation, Cognito
# administration, SES, or provisioning permissions.
# =========================================================

resource "aws_iam_role" "lambda_platform_admin_company_read_role" {
  name = "${var.project_name}-${var.environment}-lambda-platform-admin-company-read-role"

  assume_role_policy = data.aws_iam_policy_document.lambda_workload_assume_role.json

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
    Workload    = "PlatformAdminCompanyRead"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_platform_admin_company_read_basic_execution" {
  role       = aws_iam_role.lambda_platform_admin_company_read_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_platform_admin_company_read_permissions" {
  statement {
    sid    = "CompanyRegistryReadOnly"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:Scan",
    ]

    resources = [
      aws_dynamodb_table.companies.arn,
    ]
  }
}

resource "aws_iam_role_policy" "lambda_platform_admin_company_read_permissions" {
  name = "${var.project_name}-${var.environment}-lambda-platform-admin-company-read"

  role   = aws_iam_role.lambda_platform_admin_company_read_role.id
  policy = data.aws_iam_policy_document.lambda_platform_admin_company_read_permissions.json
}
