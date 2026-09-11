# =========================================================
# DistroDex Customer Portal
# app.distrodexapp.com
# =========================================================

resource "aws_s3_bucket" "app" {
  bucket = "distrodexapp-portal-${data.aws_caller_identity.current.account_id}"

  tags = {
    Project     = local.project_name
    Environment = local.environment
    Managed     = "Terraform"
    Purpose     = "DistroDex customer portal"
  }
}

resource "aws_s3_bucket_public_access_block" "app" {
  bucket = aws_s3_bucket.app.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# =========================================================
# CloudFront Origin Access Control
# =========================================================

resource "aws_cloudfront_origin_access_control" "app" {
  name        = "distrodex-prod-portal-oac"
  description = "OAC for DistroDex customer portal"

  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# =========================================================
# CloudFront Distribution
# =========================================================

resource "aws_cloudfront_distribution" "app" {
  enabled         = true
  is_ipv6_enabled = true

  default_root_object = "index.html"

  aliases = [
    local.app_domain_name,
  ]

  origin {
    domain_name = aws_s3_bucket.app.bucket_regional_domain_name
    origin_id   = "distrodex-portal-s3"

    origin_access_control_id = aws_cloudfront_origin_access_control.app.id
  }

  default_cache_behavior {
    target_origin_id       = "distrodex-portal-s3"
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

  # React SPA fallback
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
    Purpose     = "DistroDex customer portal"
  }
}

# =========================================================
# Allow CloudFront to read private portal S3 bucket
# =========================================================

resource "aws_s3_bucket_policy" "app" {
  bucket = aws_s3_bucket.app.id

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

        Resource = "${aws_s3_bucket.app.arn}/*"

        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.app.arn
          }
        }
      }
    ]
  })

  depends_on = [
    aws_s3_bucket_public_access_block.app,
  ]
}

# =========================================================
# Route53
# =========================================================

resource "aws_route53_record" "app_ipv4" {
  zone_id = data.aws_route53_zone.marketing.zone_id

  name = local.app_domain_name
  type = "A"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_ipv6" {
  zone_id = data.aws_route53_zone.marketing.zone_id

  name = local.app_domain_name
  type = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

# =========================================================
# Portal Outputs
# =========================================================

output "app_url" {
  value = "https://${local.app_domain_name}"
}

output "app_bucket_name" {
  value = aws_s3_bucket.app.bucket
}

output "app_cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.app.id
}

output "app_cloudfront_domain_name" {
  value = aws_cloudfront_distribution.app.domain_name
}
