variable "aws_region" {
  description = "AWS region for the project"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for naming AWS resource"
  type        = string
  default     = "ynj"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}


variable "beta_notification_from_email" {
  description = "Verified SES sender for DistroDex beta notifications"
  type        = string
  default     = "itlimited21@gmail.com"
}

variable "beta_notification_to_email" {
  description = "Internal recipient for DistroDex beta notifications"
  type        = string
  default     = "itlimited21@gmail.com"
}

variable "operations_alert_email" {
  description = "Email recipient for DistroDex operational CloudWatch alarms"
  type        = string
  default     = null
  nullable    = true

  validation {
    condition = (
      var.operations_alert_email == null
      ? true
      : can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.operations_alert_email))
    )

    error_message = "operations_alert_email must be null or a valid email address."
  }
}
