output "inventory_table_name" {
  value = aws_dynamodb_table.inventory.name
}

output "customers_table_name" {
  value = aws_dynamodb_table.customers.name
}
