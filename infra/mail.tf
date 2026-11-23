# Receiving email at the domain: ImprovMX forwards it (hello@ and the rest) to my inbox. Sending is
# SES (ses.tf), whose MAIL FROM is bounce.<domain>, so this SPF record only needs ImprovMX.
# allow_overwrite takes over records added by hand during ImprovMX's setup. Route 53 allows one
# record set per name and type, so any other TXT value the bare domain needs (a site verification,
# say) has to join the list below.

resource "aws_route53_record" "mx" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = var.domain
  type            = "MX"
  ttl             = 3600
  records         = ["10 mx1.improvmx.com", "20 mx2.improvmx.com"]
  allow_overwrite = true
}

resource "aws_route53_record" "apex_txt" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = var.domain
  type            = "TXT"
  ttl             = 3600
  records         = ["v=spf1 include:spf.improvmx.com ~all"]
  allow_overwrite = true
}
