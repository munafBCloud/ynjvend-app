# YNJ Vend Testing Log

## Test Environment

- Project: YNJ Vend App
- Environment: dev
- AWS Region: us-east-1
- API Endpoint: https://ra280rph8l.execute-api.us-east-1.amazonaws.com
- Inventory Table: ynj-dev-inventory
- Customers Table: ynj-dev-customers

---

## Test 1: Create Inventory Item

### Purpose

Verify that `POST /inventory` sends product data through API Gateway to Lambda and stores the item in DynamoDB.

### Command

```bash
curl -X POST https://ra280rph8l.execute-api.us-east-1.amazonaws.com/inventory \
-H "Content-Type: application/json" \
-d '{
  "productId":"coke12",
  "productName":"Coke 12oz",
  "brand":"Coca-Cola",
  "caseCost":"12.50",
  "sellingPrice":"18.99",
  "quantityInStock":120,
  "lowStockThreshold":25
}'

Issues Encountered

Missing API Gateway stage (Not Found).
Python dictionary missing comma.
Extra quotation mark in lowStock.
Incorrect indentation on except.

Resolution

Added $default API Gateway stage.
Corrected Python syntax.
Redeployed Lambda with Terraform.
Retested successfully.

Restest Result

{"message": "Inventory product created successfully", "item": {"productId": "coke12", "productName": "Coke 12oz", "brand": "Coca-Cola", "caseCost": "12.50", "quantityInStock": 120, "lowStock": 0, "createdAt": "2026-06-30T22:47:17.252521+00:00"}}

Test Successfull

## Customer CRM Testing

### POST /customers
Tested creating a convenience store customer.

Fields:
- businessName
- contactName
- phone
- locationAddress

Result:
- Customer successfully created
- customerId auto-generated
- Data saved to DynamoDB table ynj-dev-customers

### GET /customers
Tested retrieving all convenience store customers.

Result:
- API returned customer list
- API returned customer count

## Product Request Testing

### POST /requests

Purpose:
Convenience store submits a wholesale product request.

Fields tested:
- customerId
- businessName
- productId
- productName
- quantityRequested

System generated:
- requestId
- status = New
- requestedAt timestamp

Result:
- Request successfully created
- Data saved to ynj-dev-requests DynamoDB table


### GET /requests

Purpose:
Retrieve all customer product requests.

Result:
- Returned request list
- Returned total count
- Ready for dashboard integration


### PUT /requests

Purpose:
Update the fulfillment status of a product request.

Fields tested:
- requestId
- status

Statuses:
- New
- In Progress
- Fulfilled
- Cancelled

Result:
- Request status successfully updated
- Updated request returned in API response

