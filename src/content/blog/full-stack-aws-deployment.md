---
title: Deploying a Spring Boot/React Full Stack App on AWS
description: Post walking through a low-cost AWS setup deploying a Java Spring Boot backend & React TypeScript frontend with EC2, S3, CloudFront, nginx and certbot.
pubDate: 2025-06-14
tags: [AWS, DevOps, EC2, S3, CloudFront, Nginx]
---

# Deploy a Spring Boot App to EC2 with MySQL, HTTPS, and an S3 Frontend

> **IMPORTANT:** Stop your EC2 instance when you're not using it to avoid unexpected charges.

## Overview

This guide walks through deploying a full-stack application on AWS:

- **Backend:** Spring Boot JAR running on EC2, with MySQL installed directly on the instance
- **HTTPS:** Nginx as a reverse proxy + a free SSL certificate from Let's Encrypt (Certbot)
- **Frontend:** Static site hosted on S3, served over HTTPS via CloudFront

Environment variables are managed via `~/.bashrc` so they persist across restarts.

### Architecture

```
App
  → CloudFront (HTTPS) → S3 bucket (your frontend)
  → your-domain.com (HTTPS, port 443) → Nginx → Spring Boot (port 8080, local only)
                                                → MySQL (port 3306, local only)
```

### Prerequisites

- A domain name (~$3–10/year from Porkbun or Namecheap) — required for HTTPS on the backend via Certbot. **Use a common TLD like `.dev` or `.com`** — some country code TLDs (e.g. `.cv`, `.io`) are not supported by AWS Certificate Manager, which will cause problems when setting up HTTPS for your frontend.
- Your Spring Boot JAR built and ready to deploy
- Your frontend built as a static bundle (e.g. `npm run build`)

---

## Concepts

### EC2

EC2 (Elastic Compute Cloud) lets you rent virtual machines on AWS. Instances are resizable and configurable to meet different compute needs.

### VPC & Security Groups

Your EC2 instance lives inside a **VPC** (Virtual Private Cloud) — a private network within AWS. **Security groups** act as a virtual firewall, controlling what traffic can reach your instance. We'll use the default VPC and create a tightly scoped security group.

---

## Step 1: Create a Security Group

In the AWS Console, navigate to **EC2 → Security Groups → Create security group**.

### Finding Your IP Address

You'll need your current public IP to restrict SSH access. The easiest way is to visit [https://checkip.amazonaws.com](https://checkip.amazonaws.com) in your browser — it shows your public IP as a plain number.

### Inbound Rules

| Type  | Protocol | Port | Source    | Why                                       |
| ----- | -------- | ---- | --------- | ----------------------------------------- |
| SSH   | TCP      | 22   | My IP     | Terminal access — your IP only            |
| HTTP  | TCP      | 80   | 0.0.0.0/0 | Required for Certbot certificate issuance |
| HTTPS | TCP      | 443  | 0.0.0.0/0 | Your Spring Boot app via Nginx            |

When selecting **My IP** in the AWS console, it will fill in your current IP automatically.

> **Note:** Restrict SSH to **My IP** rather than `0.0.0.0/0`. Leaving SSH open to the entire internet is a significant security risk.
>
> Port 8080 does not need to be open publicly — Nginx will proxy traffic from port 443 to your app on port 8080 internally.
>
> MySQL (port 3306) does **not** need an inbound rule — it only needs to be accessible locally on the instance.

### Outbound Rules

Leave the default outbound rule in place (allow all outbound traffic).

### When Your IP Changes

Most home internet connections don't have a static IP — your ISP may assign you a new one at any time. If you suddenly can't SSH into your instance or `scp` a file across, this is the likely cause.

To fix it:

1. Find your new IP at [https://checkip.amazonaws.com](https://checkip.amazonaws.com)
2. In the AWS Console, go to **EC2 → Security Groups** and select your group
3. On the **Inbound rules** tab, click **Edit inbound rules**
4. Delete the old SSH rule and add a new one with your current IP
5. Save — you should be able to connect immediately

---

## Step 2: Create a Key Pair

Navigate to **EC2 → Key Pairs → Create key pair**.

- Give it a name (e.g. `spring-boot-deployment`)
- Leave the rest of the settings as default
- Download the `.pem` file and keep it somewhere safe

---

## Step 3: Launch an EC2 Instance

Navigate to **EC2 → Instances → Launch Instances**.

- **AMI:** Amazon Linux (free tier eligible)
- **Instance type:** t3.small (free tier eligible, 2GB RAM — recommended for Spring Boot apps with dependencies like Swagger. t3.micro only has 1GB which is too tight and will cause crashes on startup.)
- **Key pair:** Select the one you just created
- **Security group:** Select the one you just created
- Leave all other settings as default and click **Launch Instance**

Once running, navigate to your instance in the EC2 dashboard and **copy the public IP address** — you'll need it throughout this guide.

---

## Step 4: Connect to Your Instance

Open a terminal and navigate to the folder containing your `.pem` file.

```bash
ssh -i your-key-pair.pem ec2-user@your-ec2-public-ip
```

---

## Step 5: Install Dependencies

Once connected, update packages and install Java, MySQL, and Nginx.

```bash
sudo yum update -y
```

Install Java 17:

```bash
sudo yum install java-17-amazon-corretto-headless -y
```

Install MySQL:

> `mysql-server` is not available on Amazon Linux 2023. Instead, install MySQL directly from the official MySQL community repository:

```bash
sudo rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022
wget http://dev.mysql.com/get/mysql84-community-release-el9-1.noarch.rpm
sudo yum localinstall -y mysql84-community-release-el9-1.noarch.rpm
sudo yum install -y mysql-community-server
```

Start MySQL and enable it to run on boot:

```bash
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

Run the secure installation script to set a root password and lock things down:

```bash
sudo mysql_secure_installation
```

Follow the prompts — set a strong root password and answer `Y` to the remaining questions.

Install Nginx:

```bash
sudo yum install nginx -y
```

Start Nginx and enable it to run on boot:

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 6: Create Your Database

Log into MySQL:

```bash
sudo mysql -u root -p
```

Create the database your app expects:

```sql
CREATE DATABASE your_db_name;
EXIT;
```

> If you're using `?createDatabaseIfNotExist=true` in your datasource URL, this step is optional — the database will be created automatically on first connection.

---

## Step 7: Set Environment Variables

Rather than copying a `.env` file to the server, export your variables in `~/.bashrc` so they persist across restarts and SSH sessions.

```bash
nano ~/.bashrc
```

Add the following at the bottom, replacing values as appropriate:

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=your_db_name
export DB_USER=root
export DB_PASSWORD=your_mysql_password
export JWT_SECRET=your_jwt_secret
export JWT_TOKEN_EXPIRY=86400000
```

Apply the changes to your current session:

```bash
source ~/.bashrc
```

Verify a variable is set:

```bash
echo $DB_HOST
```

---

## Step 8: Deploy Your App

There are two approaches here. Option A (SCP) is simpler to understand. Option B (build on the instance) avoids the file transfer entirely and is useful if your IP changes frequently.

On your **local machine**, open a second terminal and navigate to your Spring Boot project directory.

Build the JAR:

```bash
mvn clean install
```

Copy it to the EC2 instance:

```bash
scp -i path/to/your-key-pair.pem target/your-app-0.0.1-SNAPSHOT.jar ec2-user@your-ec2-public-ip:/home/ec2-user
```

> If this fails, your IP has likely changed. See the "When Your IP Changes" section in Step 1.

---

## Step 9: Run Your Application

There are two ways to run your app. Option A (nohup) is simpler for quick testing. Option B (systemd) is more robust — it starts the app automatically on boot and restarts it if it crashes.

### Option A: nohup (simple)

```bash
nohup java -Xms128m -Xmx256m -jar your-app-0.0.1-SNAPSHOT.jar > app.log 2>&1 &
```

Logs will be written to `app.log`. To follow logs in real time:

```bash
tail -f app.log
```

To stop the app:

```bash
pkill -f your-app-0.0.1-SNAPSHOT.jar
```

> The `-Xms128m -Xmx256m` flags cap the JVM heap size, which helps prevent memory issues on smaller instances.

### Option B: systemd service (recommended)

Running your app as a systemd service means it starts automatically on boot and restarts itself if it crashes — much more reliable than nohup for anything beyond quick testing. It also solves the environment variable problem since `~/.bashrc` is not sourced by background processes — instead you define variables directly in the service file.

Create the service file:

```bash
sudo nano /etc/systemd/system/myapp.service
```

Paste the following, replacing values as appropriate:

```ini
[Unit]
Description=Spring Boot App
After=network.target mysqld.service

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user
ExecStart=/usr/bin/java -Xms128m -Xmx256m -jar /home/ec2-user/your-app-0.0.1-SNAPSHOT.jar
Environment="DB_HOST=localhost"
Environment="DB_PORT=3306"
Environment="DB_NAME=your_db_name"
Environment="DB_USER=root"
Environment="DB_PASSWORD=your_password"
Environment="JWT_SECRET=your_secret"
Environment="JWT_TOKEN_EXPIRY=86400000"
SuccessExitStatus=143
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> `After=mysqld.service` tells systemd to wait for MySQL to be ready before starting your app, which prevents connection failures on boot.

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
```

Check it's running:

```bash
sudo systemctl status myapp
```

Follow logs in real time:

```bash
sudo journalctl -u myapp -f
```

To stop, start, or restart the service:

```bash
sudo systemctl stop myapp
sudo systemctl start myapp
sudo systemctl restart myapp
```

**Redeploying a new JAR:**

SCP the new JAR to the home directory from your local machine:

```bash
scp -i path/to/your-key-pair.pem target/your-app-0.0.1-SNAPSHOT.jar ec2-user@your-ec2-public-ip:/home/ec2-user/
```

Then restart the service:

```bash
sudo systemctl restart myapp
```

---

## Part 2: HTTPS with Nginx and Certbot

### Step 10: Point Your Subdomain at EC2

In your domain registrar's DNS settings, create an **A record** pointing `api.yourdomain.com` at your EC2 instance's public IP address. This keeps your API on a clean subdomain, separate from your frontend which will live at `yourdomain.com`.

| Type | Name | Value              |
| ---- | ---- | ------------------ |
| A    | api  | your-ec2-public-ip |

> DNS changes can take a few minutes to propagate. You can check with `nslookup api.yourdomain.com`.

### Step 11: Configure Nginx

Create a new Nginx config file for your app:

```bash
sudo nano /etc/nginx/conf.d/springboot.conf
```

Paste the following, replacing `yourdomain.com` with your actual domain:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Your app should now be reachable at `http://api.yourdomain.com`. Next, we'll add HTTPS.

### Step 12: Install Certbot and Get an SSL Certificate

Install Certbot:

```bash
sudo yum install certbot python3-certbot-nginx -y
```

Request a certificate for your subdomain (Certbot will automatically update your Nginx config):

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts — enter your email and agree to the terms. Certbot will obtain the certificate and configure Nginx to use it automatically.

Certbot also installs a cron job to auto-renew the certificate before it expires. You can verify it with:

```bash
sudo certbot renew --dry-run
```

Your Spring Boot API is now accessible at `https://api.yourdomain.com`.

### Update your CORS configuration

In your Spring Boot app, make sure your CORS config allows requests from your frontend domain. You can add the CloudFront URL for now and update it later once you've pointed your domain at CloudFront:

```java
@CrossOrigin(origins = "https://yourdomain.com")
```

Or globally in a `WebMvcConfigurer` bean:

```java
registry.addMapping("/**")
    .allowedOrigins("https://yourdomain.com");
```

Rebuild and redeploy your JAR after making this change.

---

## Part 3: Frontend on S3 + CloudFront

### Step 13: Configure Environment Variables in Vite

Before building your frontend for production, you need to make sure it's pointing at your API subdomain rather than localhost.

Create a `.env.development` file in your project root for local development:

```
VITE_API_URL=http://localhost:8080
```

Create a `.env.production` file for production builds:

```
VITE_API_URL=https://api.yourdomain.com
```

Then update any API calls in your code to use the environment variable:

```javascript
fetch(`${import.meta.env.VITE_API_URL}/your-endpoint`);
```

Vite bakes `VITE_` prefixed variables directly into the bundle at build time — so `npm run dev` will automatically hit your local backend, and `npm run build` will hit your production API, with no code changes needed between environments.

> Make sure `.env.production` is in your `.gitignore` if it contains anything sensitive, though API URLs are generally fine to commit.

### Step 14: Build and Upload to S3

Build your frontend:

```bash
npm run build
```

This generates a `dist/` folder containing your static files.

In the AWS Console, navigate to **S3 → Create bucket**.

- Give it a unique name (e.g. `my-app-frontend`)
- Choose the same region as your EC2 instance
- Leave "Block all public access" enabled — we'll control access via CloudFront using an Origin Access Control (OAC) policy
- Leave all other settings as default and create the bucket

Upload your frontend build files:

- Navigate into your bucket and click **Upload**
- Upload the entire contents of the `dist/` folder — not the folder itself, just its contents

### Step 15: Create a CloudFront Distribution

Navigate to **CloudFront → Create distribution**.

**Origin settings:**

- **Origin domain:** Select your S3 bucket from the dropdown
- **Origin access:** Select **Origin access control settings (recommended)**
- Click **Create new OAC** and accept the defaults

**Default cache behaviour settings:**

- **Viewer protocol policy:** Redirect HTTP to HTTPS
- Leave everything else as default

**Settings:**

- **Default root object:** `index.html`

Click **Create distribution**. CloudFront will prompt you to copy an S3 bucket policy — do this and apply it to your bucket under **S3 → Permissions → Bucket policy**.

> The distribution takes a few minutes to deploy. Once ready, CloudFront gives you a URL like `https://abc123.cloudfront.net` — this is your frontend URL. HTTPS is included out of the box with no certificate setup required.

Make a note of this URL — you'll need it to update your backend CORS config in the next step.

### Step 16: Update CORS to Allow Your CloudFront URL

Go back to your Spring Boot app and update your CORS config to allow requests from your CloudFront URL:

```java
registry.addMapping("/**")
    .allowedOrigins("https://abc123.cloudfront.net");
```

Rebuild and redeploy your JAR, then restart the service:

```bash
sudo systemctl restart myapp
```

### Step 17: (Optional) Add a Custom Domain to CloudFront

If you want your frontend served from `yourdomain.com` instead of the CloudFront URL, you can add a custom domain. **This requires a `.dev` or `.com` TLD** — AWS Certificate Manager does not support all country code TLDs (e.g. `.cv`), which will cause certificate issuance to fail.

In your CloudFront distribution settings, edit and add:

- **Alternate domain names (CNAMEs):** `yourdomain.com`
- **Custom SSL certificate:** Click **Request certificate**, follow the ACM wizard to issue a free certificate for `yourdomain.com`, then select it here

Then in your domain registrar's DNS settings, add a CNAME record pointing your root domain at your CloudFront distribution:

| Type  | Name                  | Value                 |
| ----- | --------------------- | --------------------- |
| CNAME | @ (or yourdomain.com) | abc123.cloudfront.net |

> Some registrars don't allow a CNAME on the root domain — if that's the case, look for an **ALIAS** or **ANAME** record type which achieves the same thing.

Once set up, update your backend CORS config to use your custom domain instead of the CloudFront URL, and redeploy.

### Step 18: Handle Client-Side Routing (if applicable)

If your frontend uses client-side routing (React Router, Vue Router, etc.), you need to tell CloudFront to serve `index.html` for 404s, otherwise refreshing on any route other than `/` will break.

In your CloudFront distribution, go to **Error pages → Create custom error response**:

- **HTTP error code:** 404
- **Response page path:** `/index.html`
- **HTTP response code:** 200

Repeat for error code 403.

### Step 19: Redeploying Frontend Updates

When you make changes to your frontend, rebuild and re-upload the `dist/` folder contents to S3:

```bash
npm run build
```

Then invalidate the CloudFront cache so users get the new version immediately rather than a cached old one. Navigate to **CloudFront → Your distribution → Invalidations → Create invalidation** and enter `/*`.

---

**Can't connect to MySQL:**
Check that MySQL is running: `sudo systemctl status mysqld`

**Environment variables not found:**
Make sure you ran `source ~/.bashrc` after editing it, or reconnect your SSH session.

**'Table does not exist' error:**
Ensure `spring.jpa.hibernate.ddl-auto=update` is set. This tells Hibernate to create tables automatically. Remove this in production if you manage schema migrations manually (e.g. with Flyway).

**Nginx returns 502 Bad Gateway:**
Your Spring Boot app isn't running or isn't listening on port 8080. Check `app.log` for errors and make sure the process is running: `ps aux | grep java`

**Certbot fails to issue a certificate:**
Make sure your domain's A record is pointing at your EC2 IP and has propagated, and that port 80 is open in your security group (required for the ACME challenge).

**Frontend gets CORS errors calling the backend:**
Make sure your Spring Boot CORS config includes `https://yourdomain.com`, and that your frontend is calling the backend via `https://api.yourdomain.com` (not the EC2 IP directly).

**CloudFront returns 403 on all routes:**
Check that the S3 bucket policy includes the OAC permission that CloudFront generated for you.

---

## Resources

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [appleboy/ssh-action](https://github.com/appleboy/ssh-action)
- [What is EC2?](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html)
- [AWS Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- [MySQL on Amazon Linux](https://dev.mysql.com/doc/refman/8.0/en/linux-installation.html)
- [Certbot documentation](https://certbot.eff.org/)
- [Hosting a static site on S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [CloudFront with S3 origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStartedCreateDistrib.html)
