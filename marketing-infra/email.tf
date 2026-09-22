# =========================================================
# DistroDex transactional email
#
# Domain-level SES identity used for DistroDex application
# email. Cognito is intentionally NOT configured here yet.
# =========================================================

resource "aws_sesv2_email_identity" "distrodex" {
  email_identity = local.domain_name

  tags = {
    Project     = local.project_name
    Environment = local.environment
    Managed     = "Terraform"
    Purpose     = "DistroDex transactional email"
  }
}

# SES Easy DKIM supplies three tokens. Each token requires a
# CNAME under _domainkey.distrodexapp.com pointing to AWS SES.
resource "aws_route53_record" "ses_dkim" {
  count = 3

  zone_id = data.aws_route53_zone.marketing.zone_id

  name = "${aws_sesv2_email_identity.distrodex.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.domain_name}"
  type = "CNAME"
  ttl  = 300

  records = [
    "${aws_sesv2_email_identity.distrodex.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"
  ]
}

output "ses_identity_arn" {
  description = "SES identity ARN for the DistroDex domain"
  value       = aws_sesv2_email_identity.distrodex.arn
}

output "ses_dkim_tokens" {
  description = "Easy DKIM tokens for the DistroDex SES identity"
  value       = aws_sesv2_email_identity.distrodex.dkim_signing_attributes[0].tokens
}

# Initial DMARC policy for DistroDex application email.
#
# Start in monitoring mode while production email is being established.
# Enforcement can be tightened to quarantine/reject after legitimate
# sending sources and alignment have been validated.
resource "aws_route53_record" "dmarc" {
  zone_id = data.aws_route53_zone.marketing.zone_id

  name = "_dmarc.${local.domain_name}"
  type = "TXT"
  ttl  = 300

  records = [
    "v=DMARC1; p=none; adkim=r; aspf=r; pct=100"
  ]
}
