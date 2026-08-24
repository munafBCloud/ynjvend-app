# =========================================================
# DISTRODEX OBSERVABILITY
# =========================================================

locals {
  observability_log_retention_days = (
    var.environment == "prod" ? 30 :
    var.environment == "test" ? 14 :
    7
  )

  monitored_lambda_functions = {
    create_customer = aws_lambda_function.create_customer.function_name
    get_customers   = aws_lambda_function.get_customers.function_name
    update_customer = aws_lambda_function.update_customer.function_name
    delete_customer = aws_lambda_function.delete_customer.function_name

    create_inventory         = aws_lambda_function.create_inventory.function_name
    get_inventory            = aws_lambda_function.get_inventory.function_name
    get_inventory_by_barcode = aws_lambda_function.get_inventory_by_barcode.function_name
    receive_inventory        = aws_lambda_function.receive_inventory.function_name
    update_inventory         = aws_lambda_function.update_inventory.function_name
    delete_inventory         = aws_lambda_function.delete_inventory.function_name

    create_order = aws_lambda_function.create_order.function_name
    get_orders   = aws_lambda_function.get_orders.function_name
    update_order = aws_lambda_function.update_order.function_name

    create_invoice = aws_lambda_function.create_invoice.function_name
    get_invoices   = aws_lambda_function.get_invoices.function_name
    update_invoice = aws_lambda_function.update_invoice.function_name
  }
}

# ---------------------------------------------------------
# API Gateway access logs
# ---------------------------------------------------------

resource "aws_cloudwatch_log_group" "api_access_logs" {
  name = "/aws/apigateway/${var.project_name}-${var.environment}-api"

  retention_in_days = local.observability_log_retention_days

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Managed     = "Terraform"
  }
}

# ---------------------------------------------------------
# API Gateway 5xx alarm
# ---------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-api-5xx"
  alarm_description   = "DistroDex API Gateway returned one or more 5xx errors."
  comparison_operator = "GreaterThanOrEqualToThreshold"

  evaluation_periods = 1
  threshold          = 1

  metric_name = "5xx"
  namespace   = "AWS/ApiGateway"
  period      = 300
  statistic   = "Sum"

  treat_missing_data = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.ynj_api.id
    Stage = "$default"
  }
}

# ---------------------------------------------------------
# Lambda error alarms
# ---------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = local.monitored_lambda_functions

  alarm_name = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}-errors"

  alarm_description = "Lambda ${each.value} returned one or more errors."

  comparison_operator = "GreaterThanOrEqualToThreshold"

  evaluation_periods = 1
  threshold          = 1

  metric_name = "Errors"
  namespace   = "AWS/Lambda"
  period      = 300
  statistic   = "Sum"

  treat_missing_data = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }
}

# ---------------------------------------------------------
# Lambda throttle alarms
# ---------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  for_each = local.monitored_lambda_functions

  alarm_name = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}-throttles"

  alarm_description = "Lambda ${each.value} experienced one or more throttled invocations."

  comparison_operator = "GreaterThanOrEqualToThreshold"

  evaluation_periods = 1
  threshold          = 1

  metric_name = "Throttles"
  namespace   = "AWS/Lambda"
  period      = 300
  statistic   = "Sum"

  treat_missing_data = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }
}

# ---------------------------------------------------------
# Operational dashboard
# ---------------------------------------------------------

resource "aws_cloudwatch_dashboard" "distrodex" {
  dashboard_name = "${var.project_name}-${var.environment}-operations"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          title   = "API Requests"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false

          metrics = [
            [
              "AWS/ApiGateway",
              "Count",
              "ApiId",
              aws_apigatewayv2_api.ynj_api.id,
              "Stage",
              "$default"
            ]
          ]

          period = 300
          stat   = "Sum"
        }
      },

      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          title   = "API 5xx Errors"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false

          metrics = [
            [
              "AWS/ApiGateway",
              "5xx",
              "ApiId",
              aws_apigatewayv2_api.ynj_api.id,
              "Stage",
              "$default"
            ]
          ]

          period = 300
          stat   = "Sum"
        }
      },

      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          title   = "Lambda Errors"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false

          metrics = [
            for function_name in values(local.monitored_lambda_functions) : [
              "AWS/Lambda",
              "Errors",
              "FunctionName",
              function_name
            ]
          ]

          period = 300
          stat   = "Sum"
        }
      },

      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          title   = "Lambda Throttles"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false

          metrics = [
            for function_name in values(local.monitored_lambda_functions) : [
              "AWS/Lambda",
              "Throttles",
              "FunctionName",
              function_name
            ]
          ]

          period = 300
          stat   = "Sum"
        }
      }
    ]
  })
}
