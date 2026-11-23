variable "region" {
  description = "Where everything but the certificate lives"
  type        = string
  default     = "ap-southeast-2"
}

variable "domain" {
  description = "The site's domain. Its Route 53 hosted zone must already exist: Terraform reads it but doesn't manage it"
  type        = string
  default     = "alexbaulderstone.com"
}

variable "owner_email" {
  description = "Where enquiry notifications go"
  type        = string
}

variable "from_email" {
  description = "What the contact form's emails come from, on the domain"
  type        = string
  default     = "Alex Baulderstone <hello@alexbaulderstone.com>"
}

variable "github_subject" {
  description = "How GitHub's OIDC tokens name the repo whose production environment may deploy: sub_claim_prefix from `gh api repos/OWNER/REPO/actions/oidc/customization/sub`. The repo uses immutable subjects, which include the owner's and repo's IDs, so a renamed or recreated repo can't take over the role"
  type        = string
  default     = "repo:ABaulderstone@46916203/astro-portfolio@1464148982"
}

variable "contact_concurrency" {
  description = "Most contact Lambdas running at once, capping what a flood of submissions can cost. -1 for no cap: an account whose concurrency quota is still 10 can't reserve any"
  type        = number
  default     = -1
}
