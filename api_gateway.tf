resource "aws_apigatewayv2_api" "ynj_api" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "create_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "post_inventory" {
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "POST /inventory"

  target = "integrations/${aws_apigatewayv2_integration.create_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_inventory.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_apigatewayv2_integration" "get_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_inventory" {
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "GET /inventory"

  target = "integrations/${aws_apigatewayv2_integration.get_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_get_inventory_api_gateway" {
  statement_id  = "AllowGetInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_inventory.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_apigatewayv2_integration" "update_inventory_integration" {
  api_id                 = aws_apigatewayv2_api.ynj_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.update_inventory.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "put_inventory" {
  api_id    = aws_apigatewayv2_api.ynj_api.id
  route_key = "PUT /inventory"

  target = "integrations/${aws_apigatewayv2_integration.update_inventory_integration.id}"
}

resource "aws_lambda_permission" "allow_update_inventory_api_gateway" {
  statement_id  = "AllowUpdateInventoryAPI"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_inventory.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.ynj_api.id
  name        = "$default"
  auto_deploy = true
}
