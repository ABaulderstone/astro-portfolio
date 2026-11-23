# Read, not managed, so a destroy can never take the zone (and every record in it) with it
data "aws_route53_zone" "main" {
  name = var.domain
}

# A and AAAA for the bare domain and www, all pointing at the distribution. www redirects to the
# bare domain in the CloudFront Function (functions/rewrite.js).
resource "aws_route53_record" "site" {
  for_each = {
    for pair in setproduct([var.domain, "www.${var.domain}"], ["A", "AAAA"]) : "${pair[0]} ${pair[1]}" => {
      name = pair[0]
      type = pair[1]
    }
  }

  zone_id         = data.aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  allow_overwrite = true

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
