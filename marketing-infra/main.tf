terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

locals {
  domain_name     = "distrodexapp.com"
  www_domain_name = "www.distrodexapp.com"

  project_name = "ynj"
  environment  = "prod"
}

# =========================================================
# Existing Route 53 hosted zone
# =========================================================

data "aws_route53_zone" "marketing" {
  name         = local.domain_name
  private_zone = false
}


# =========================================================
# ACM certificate
# CloudFront certificates must be in us-east-1.
# =========================================================

resource "aws_acm_certificate" "marketing" {
  domain_name = local.domain_name

  subject_alternative_names = [
    local.www_domain_name,
  ]

  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Project     = local.project_name
    Environment = local.environment
    Managed     = "Terraform"
    Purpose     = "DistroDex marketing site"
  }
}


resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.marketing.domain_validation_options :
    option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.marketing.zone_id

  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]

  ttl = 60
}


resource "aws_acm_certificate_validation" "marketing" {
  certificate_arn = aws_acm_certificate.marketing.arn

  validation_record_fqdns = [
    for record in aws_route53_record.certificate_validation :
    record.fqdn
  ]
}


# =========================================================
# Private S3 origin
# =========================================================

resource "aws_s3_bucket" "marketing" {
  bucket = "distrodexapp-marketing-${data.aws_caller_identity.current.account_id}"

  tags = {
    Project     = local.project_name
    Environment = local.environment
    Managed     = "Terraform"
    Purpose     = "DistroDex marketing site"
  }
}


resource "aws_s3_bucket_public_access_block" "marketing" {
  bucket = aws_s3_bucket.marketing.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


resource "aws_s3_bucket_ownership_controls" "marketing" {
  bucket = aws_s3_bucket.marketing.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}


resource "aws_s3_bucket_server_side_encryption_configuration" "marketing" {
  bucket = aws_s3_bucket.marketing.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}


# =========================================================
# CloudFront Origin Access Control
# =========================================================

resource "aws_cloudfront_origin_access_control" "marketing" {
  name = "distrodex-prod-marketing-oac"

  description = "OAC for DistroDex marketing site"

  origin_access_control_origin_type = "s3"

  signing_behavior = "always"
  signing_protocol = "sigv4"
}


# =========================================================
# AWS-managed CloudFront cache policy
# =========================================================

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}


# =========================================================
# CloudFront distribution
# =========================================================

resource "aws_cloudfront_distribution" "marketing" {
  enabled         = true
  is_ipv6_enabled = true

  default_root_object = "index.html"

  aliases = [
    local.domain_name,
    local.www_domain_name,
  ]

  origin {
    domain_name = aws_s3_bucket.marketing.bucket_regional_domain_name
    origin_id   = "distrodex-marketing-s3"

    origin_access_control_id = aws_cloudfront_origin_access_control.marketing.id
  }

  default_cache_behavior {
    target_origin_id = "distrodex-marketing-s3"

    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = [
      "GET",
      "HEAD",
      "OPTIONS",
    ]

    cached_methods = [
      "GET",
      "HEAD",
    ]

    compress = true

    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # SPA fallback
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.marketing.certificate_arn

    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  price_class = "PriceClass_100"

  depends_on = [
    aws_acm_certificate_validation.marketing,
  ]

  tags = {
    Project     = local.project_name
    Environment = local.environment
    Managed     = "Terraform"
    Purpose     = "DistroDex marketing site"
  }
}


# =========================================================
# Allow CloudFront to read private S3 objects
# =========================================================

resource "aws_s3_bucket_policy" "marketing" {
  bucket = aws_s3_bucket.marketing.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "AllowCloudFrontReadOnly"
        Effect = "Allow"

        Principal = {
          Service = "cloudfront.amazonaws.com"
        }

        Action = [
          "s3:GetObject"
        ]

        Resource = "${aws_s3_bucket.marketing.arn}/*"

        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.marketing.arn
          }
        }
      }
    ]
  })

  depends_on = [
    aws_s3_bucket_public_access_block.marketing,
  ]
}


# =========================================================
# Route 53
# =========================================================

resource "aws_route53_record" "root_ipv4" {
  zone_id = data.aws_route53_zone.marketing.zone_id

  name = local.domain_name
  type = "A"

  alias {
    name                   = aws_cloudfront_distribution.marketing.domain_name
    zone_id                = aws_cloudfront_distribution.marketing.hosted_zone_id
    evaluate_target_health = false
  }
}


resource "aws_route53_record" "root_ipv6" {
  zone_id = data.aws_route53_zone.marketing.zone_id

  name = local.domain_name
  type = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.marketing.domain_name
    zone_id                = aws_cloudfront_distribution.marketing.hosted_zone_id
    evaluate_target_health = false
  }
}


resource "aws_route53_record" "www_ipv4" {
  zone_id = data.aws_route53_zone.marketing.zone_id

  name = local.www_domain_name
  type = "A"

  alias {
    name                   = aws_cloudfront_distribution.marketing.domain_name
    zone_id                = aws_cloudfront_distribution.marketing.hosted_zone_id
    evaluate_target_health = false
  }
}


resource "aws_route53_record" "www_ipv6" {
  zone_id = data.aws_route53_zone.marketing.zone_id

  name = local.www_domain_name
  type = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.marketing.domain_name
    zone_id                = aws_cloudfront_distribution.marketing.hosted_zone_id
    evaluate_target_health = false
  }
}


# =========================================================
# Outputs
# =========================================================

output "site_url" {
  value = "https://${local.domain_name}"
}

output "bucket_name" {
  value = aws_s3_bucket.marketing.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.marketing.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.marketing.domain_name
}
