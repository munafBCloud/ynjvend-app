resource "aws_apigatewayv2_api" "ynj_api" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["*"]
  }
}

# ---------------------------------------------------------
# Cognito JWT Authorizer
# ---------------------------------------------------------

resource "aws_apigatewayv2_authorizer" "cognito_jwt" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  name            = "ynj-cognito-jwt"
  authorizer_type = "JWT"

  identity_sources = [
    "$request.header.Authorization"
  ]

  jwt_configuration {
    audience = [
      aws_cognito_user_pool_client.owner_portal.id
    ]

    issuer = "https://${aws_cognito_user_pool.ynj_users.endpoint}"
  }
}

# ---------------------------------------------------------
# CREATE INVENTORY
# Existing administrative route: POST /inventory
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "create_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "post_inventory" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "POST /inventory"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.create_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_inventory.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# GET FULL INVENTORY
# Existing owner-dashboard route: GET /inventory
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "get_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_inventory" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "GET /inventory"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.get_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_get_inventory_api_gateway" {
  statement_id  = "AllowGetInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_inventory.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}

# ---------------------------------------------------------
# UPDATE INVENTORY
# Existing administrative route: PUT /inventory
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "update_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.update_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "put_inventory" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "PUT /inventory"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.update_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_update_inventory_api_gateway" {
  statement_id  = "AllowUpdateInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_inventory.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# DELETE INVENTORY
# Existing administrative route: DELETE /inventory
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "delete_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.delete_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "delete_inventory" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "DELETE /inventory"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.delete_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_delete_inventory_api_gateway" {
  statement_id  = "AllowDeleteInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_inventory.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# CREATE CUSTOMER
# Existing route: POST /customers
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "create_customer_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_customer.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_customer_route" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "POST /customers"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.create_customer_integration.id}"
}

resource "aws_lambda_permission" "allow_api_create_customer" {
  statement_id  = "AllowExecutionFromAPICreateCustomer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_customer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# GET CUSTOMERS
# Existing owner-dashboard route: GET /customers
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "get_customers_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_customers.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_customers_route" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "GET /customers"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.get_customers_integration.id}"
}

resource "aws_lambda_permission" "allow_api_get_customers" {
  statement_id  = "AllowExecutionFromAPIGetCustomers"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_customers.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}

# ---------------------------------------------------------
# CREATE ORDER
# Owner-created distribution order: POST /orders
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "create_order_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_order.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_order_route" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "POST /orders"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.create_order_integration.id}"
}

resource "aws_lambda_permission" "allow_api_create_order" {
  statement_id  = "AllowExecutionFromAPICreateOrder"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_order.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}

# ---------------------------------------------------------
# GET ORDERS
# Owner order list: GET /orders
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "get_orders_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_orders.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_orders_route" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "GET /orders"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.get_orders_integration.id}"
}

resource "aws_lambda_permission" "allow_api_get_orders" {
  statement_id  = "AllowExecutionFromAPIGetOrders"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_orders.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}

# ---------------------------------------------------------
# UPDATE ORDER
# Owner order status update: PUT /orders/{orderId}
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "update_order_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.update_order.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "update_order_route" {
  api_id             = aws_apigatewayv2_api.ynj_api.id
  route_key          = "PUT /orders/{orderId}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id
  target             = "integrations/${aws_apigatewayv2_integration.update_order_integration.id}"
}

resource "aws_lambda_permission" "allow_api_update_order" {
  statement_id  = "AllowExecutionFromAPIUpdateOrder"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_order.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}

# ---------------------------------------------------------
# DEFAULT API STAGE
# ---------------------------------------------------------

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.ynj_api.id
  name        = "$default"
  auto_deploy = true

  route_settings {
    route_key              = "POST /beta-applications"
    throttling_burst_limit = 3
    throttling_rate_limit  = 1
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access_logs.arn

    format = jsonencode({
      requestId        = "$context.requestId"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }
}

# ---------------------------------------------------------
# UPDATE CUSTOMER
# Existing authenticated route: PUT /customers
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "update_customer_integration" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.update_customer.arn

  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "update_customer_route" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "PUT /customers"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id

  target = "integrations/${aws_apigatewayv2_integration.update_customer_integration.id}"
}

resource "aws_lambda_permission" "allow_api_update_customer" {
  statement_id  = "allow-apigateway-put-customers"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_customer.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/PUT/customers"
}


# ---------------------------------------------------------
# DELETE CUSTOMER
# Existing authenticated route: DELETE /customers
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "delete_customer_integration" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.delete_customer.arn

  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "delete_customer_route" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "DELETE /customers"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id

  target = "integrations/${aws_apigatewayv2_integration.delete_customer_integration.id}"
}

resource "aws_lambda_permission" "allow_api_delete_customer" {
  statement_id  = "allow-apigateway-delete-customers"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete_customer.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/DELETE/customers"
}

# ---------------------------------------------------------
# CREATE INVOICE
# POST /invoices
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "create_invoice_integration" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.create_invoice.invoke_arn

  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "create_invoice_route" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "POST /invoices"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id

  target = "integrations/${aws_apigatewayv2_integration.create_invoice_integration.id}"
}

resource "aws_lambda_permission" "allow_api_create_invoice" {
  statement_id  = "apigateway-create-invoice"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_invoice.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/POST/invoices"
}


# ---------------------------------------------------------
# GET INVOICES
# GET /invoices
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "get_invoices_integration" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.get_invoices.invoke_arn

  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "get_invoices_route" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "GET /invoices"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id

  target = "integrations/${aws_apigatewayv2_integration.get_invoices_integration.id}"
}

resource "aws_lambda_permission" "allow_api_get_invoices" {
  statement_id  = "apigateway-get-invoices"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_invoices.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/GET/invoices"
}


# ---------------------------------------------------------
# UPDATE INVOICE
# PUT /invoices/{invoiceId}
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "update_invoice_integration" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.update_invoice.invoke_arn

  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "update_invoice_route" {
  api_id = aws_apigatewayv2_api.ynj_api.id

  route_key = "PUT /invoices/{invoiceId}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_jwt.id

  target = "integrations/${aws_apigatewayv2_integration.update_invoice_integration.id}"
}

resource "aws_lambda_permission" "allow_api_update_invoice" {
  statement_id  = "apigateway-update-invoice"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_invoice.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/PUT/invoices/*"
}
