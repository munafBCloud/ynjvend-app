output "inventory_table_name" {
  value = aws_dynamodb_table.inventory.name
}

output "customers_table_name" {
  value = aws_dynamodb_table.customers.name
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.ynj_api.api_endpoint
}
