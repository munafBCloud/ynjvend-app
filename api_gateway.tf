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
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "POST /inventory"
  target    = "integrations/${aws_apigatewayv2_integration.create_inventory_integration.id}"
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
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "GET /inventory"
  target    = "integrations/${aws_apigatewayv2_integration.get_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_get_inventory_api_gateway" {
  statement_id  = "AllowGetInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_inventory.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# GET PUBLIC INVENTORY
# New customer-safe route: GET /public/inventory
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "get_public_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_public_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_public_inventory" {
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "GET /public/inventory"
  target    = "integrations/${aws_apigatewayv2_integration.get_public_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_get_public_inventory_api_gateway" {
  statement_id  = "AllowGetPublicInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_public_inventory.function_name
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
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "PUT /inventory"
  target    = "integrations/${aws_apigatewayv2_integration.update_inventory_integration.id}"
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
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "DELETE /inventory"
  target    = "integrations/${aws_apigatewayv2_integration.delete_inventory_integration.id}"
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
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "POST /customers"
  target    = "integrations/${aws_apigatewayv2_integration.create_customer_integration.id}"
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
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "GET /customers"
  target    = "integrations/${aws_apigatewayv2_integration.get_customers_integration.id}"
}

resource "aws_lambda_permission" "allow_api_get_customers" {
  statement_id  = "AllowExecutionFromAPIGetCustomers"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_customers.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# CREATE PRODUCT REQUEST
# Existing public customer route: POST /requests
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "create_request_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_request.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_request_route" {
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "POST /requests"
  target    = "integrations/${aws_apigatewayv2_integration.create_request_integration.id}"
}

resource "aws_lambda_permission" "allow_api_create_request" {
  statement_id  = "AllowExecutionFromAPICreateRequest"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_request.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# GET PRODUCT REQUESTS
# Existing owner-dashboard route: GET /requests
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "get_requests_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_requests.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_requests_route" {
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "GET /requests"
  target    = "integrations/${aws_apigatewayv2_integration.get_requests_integration.id}"
}

resource "aws_lambda_permission" "allow_api_get_requests" {
  statement_id  = "AllowExecutionFromAPIGetRequests"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_requests.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ynj_api.execution_arn}/*/*"
}


# ---------------------------------------------------------
# UPDATE PRODUCT REQUEST
# Existing owner-dashboard route: PUT /requests
# ---------------------------------------------------------

resource "aws_apigatewayv2_integration" "update_request_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.update_request.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "update_request_route" {
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "PUT /requests"
  target    = "integrations/${aws_apigatewayv2_integration.update_request_integration.id}"
}

resource "aws_lambda_permission" "allow_api_update_request" {
  statement_id  = "AllowExecutionFromAPIUpdateRequest"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_request.function_name
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
}
