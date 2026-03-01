terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2" # Default to Sydney, can be parameterized
}

# ----------------------------------------------------
# 1. S3 Buckets
# ----------------------------------------------------

# Bucket 1: Frontend Hosting
resource "aws_s3_bucket" "frontend_hosting" {
  bucket_prefix = "csv-app-frontend-"
}

resource "aws_s3_bucket_website_configuration" "frontend_hosting_config" {
  bucket = aws_s3_bucket.frontend_hosting.id

  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html" # SPA routing wrapper
  }
}

resource "aws_s3_bucket_public_access_block" "frontend_hosting_pba" {
  bucket = aws_s3_bucket.frontend_hosting.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket = aws_s3_bucket.frontend_hosting.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_hosting.arn}/*"
      },
    ]
  })
  depends_on = [aws_s3_bucket_public_access_block.frontend_hosting_pba]
}


# Bucket 2: CSV Uploads (Private, allows CORS for browser direct uploads)
resource "aws_s3_bucket" "csv_uploads" {
  bucket_prefix = "csv-app-uploads-"
}

resource "aws_s3_bucket_cors_configuration" "csv_uploads_cors" {
  bucket = aws_s3_bucket.csv_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"] # In production, restrict to frontend domain
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ----------------------------------------------------
# 2. SQS Queue
# ----------------------------------------------------

resource "aws_sqs_queue" "import_jobs_fifo" {
  name                        = "csv-import-jobs.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 300 # Give worker 5 mins to process a chunked file
}

# ----------------------------------------------------
# 3. ECR Repositories (Docker Images)
# ----------------------------------------------------

resource "aws_ecr_repository" "flask_api" {
  name                 = "csv-app-flask-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "python_worker" {
  name                 = "csv-app-python-worker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ----------------------------------------------------
# 4. IAM Roles & Policies for ECS
# ----------------------------------------------------

# ECS Task Execution Role (to pull from ECR and send logs)
resource "aws_iam_role" "ecs_execution_role" {
  name = "csv_app_ecs_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (the permissions the App actually has at runtime)
resource "aws_iam_role" "ecs_task_role" {
  name = "csv_app_ecs_task_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Custom Policy: Let the containers read/write to S3 and SQS
resource "aws_iam_policy" "ecs_task_custom_policy" {
  name        = "csv_app_ecs_task_custom_policy"
  description = "Allows ECS tasks to interact with S3 and SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.csv_uploads.arn,
          "${aws_s3_bucket.csv_uploads.arn}/*"
        ]
      },
      {
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Effect   = "Allow"
        Resource = aws_sqs_queue.import_jobs_fifo.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_custom_policy_attach" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_custom_policy.arn
}

# ----------------------------------------------------
# 5. Outputs
# ----------------------------------------------------

output "frontend_url" {
  value = aws_s3_bucket_website_configuration.frontend_hosting_config.website_endpoint
}

output "s3_upload_bucket_name" {
  value = aws_s3_bucket.csv_uploads.id
}

output "sqs_queue_url" {
  value = aws_sqs_queue.import_jobs_fifo.url
}

output "ecr_api_url" {
  value = aws_ecr_repository.flask_api.repository_url
}

output "ecr_worker_url" {
  value = aws_ecr_repository.python_worker.repository_url
}
