---
# Placeholder post: replace with a real one
title: Deploying a full-stack app to AWS on a budget
description: Placeholder post walking through a low-cost AWS setup with EC2, S3, CloudFront, nginx and certbot.
pubDate: 2025-06-14
tags: [AWS, DevOps]
---

This is a placeholder post about a cheap AWS deployment. Replace it with a real one.

## The setup

- The backend runs on a small EC2 instance behind nginx
- The frontend is static files on S3, served through CloudFront
- HTTPS comes from certbot, renewing automatically

## nginx as a reverse proxy

```nginx
server {
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
}
```

Then run `sudo certbot --nginx` and follow the prompts.
