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
