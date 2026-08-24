output "inventory_table_name" {
  value = aws_dynamodb_table.inventory_v2.name
}

output "customers_table_name" {
  value = aws_dynamodb_table.customers_v2.name
}

output "orders_table_name" {
  value = aws_dynamodb_table.orders_v2.name
}

output "invoices_table_name" {
  value = aws_dynamodb_table.invoices.name
}

output "companies_table_name" {
  value = aws_dynamodb_table.companies.name
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.ynj_api.api_endpoint
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.ynj_users.id
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool issuer endpoint"
  value       = aws_cognito_user_pool.ynj_users.endpoint
}

output "cognito_owner_portal_client_id" {
  description = "Cognito app client ID for the React owner portal"
  value       = aws_cognito_user_pool_client.owner_portal.id
}

output "cognito_admin_group_name" {
  description = "Cognito administrator group"
  value       = aws_cognito_user_group.admins.name
}

output "cognito_employee_group_name" {
  description = "Cognito employee group"
  value       = aws_cognito_user_group.employees.name
}


output "barcode_registry_table_name" {
  value = aws_dynamodb_table.barcode_registry.name
}


output "inventory_receipts_table_name" {
  value = aws_dynamodb_table.inventory_receipts.name
}
