# ecs.tf

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# --- Security Groups ---

resource "aws_security_group" "alb_sg" {
  name        = "csv-app-alb-sg"
  description = "Allow inbound traffic to ALB"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs_sg" {
  name        = "csv-app-ecs-sg"
  description = "Allow inbound from ALB and all outbound"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- Application Load Balancer ---

resource "aws_lb" "api_alb" {
  name               = "csv-app-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = data.aws_subnets.default.ids
}

resource "aws_lb_target_group" "api_tg" {
  name        = "csv-app-api-tg"
  port        = 5000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    path                = "/api/templates" # Endpoint that returns 200
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }
}

resource "aws_lb_listener" "api_listener" {
  load_balancer_arn = aws_lb.api_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }
}

# --- CloudWatch Logs ---

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/ecs/csv-app-api"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "worker_logs" {
  name              = "/ecs/csv-app-worker"
  retention_in_days = 7
}

# --- ECS Cluster ---

resource "aws_ecs_cluster" "main" {
  name = "csv-app-cluster"
}

# --- ECS Task Definitions ---

resource "aws_ecs_task_definition" "api" {
  family                   = "csv-app-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "flask-api"
      image     = "${aws_ecr_repository.flask_api.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
        }
      ]
      environment = [
        { name = "FLASK_ENV", value = "production" },
        { name = "AWS_REGION", value = "ap-southeast-2" },
        { name = "S3_UPLOAD_BUCKET", value = aws_s3_bucket.csv_uploads.id },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.import_jobs_fifo.url },
        { name = "MONGO_URI", value = "mongodb://mongodb.csv-app.local:27017/csv" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api_logs.name
          "awslogs-region"        = "ap-southeast-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "csv-app-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "python-worker"
      image     = "${aws_ecr_repository.python_worker.repository_url}:latest"
      essential = true
      environment = [
        { name = "AWS_REGION", value = "ap-southeast-2" },
        { name = "S3_UPLOAD_BUCKET", value = aws_s3_bucket.csv_uploads.id },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.import_jobs_fifo.url },
        { name = "MONGO_URI", value = "mongodb://mongodb.csv-app.local:27017/csv" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.worker_logs.name
          "awslogs-region"        = "ap-southeast-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# --- Service Discovery (Cloud Map) ---
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "csv-app.local"
  description = "Service discovery for CSV app"
  vpc         = data.aws_vpc.default.id
}

resource "aws_service_discovery_service" "mongodb" {
  name = "mongodb"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# --- MongoDB Task Definition ---
resource "aws_ecs_task_definition" "mongodb" {
  family                   = "csv-app-mongodb"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "mongodb"
      image     = "mongo:latest"
      essential = true
      portMappings = [
        {
          containerPort = 27017
          hostPort      = 27017
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api_logs.name
          "awslogs-region"        = "ap-southeast-2"
          "awslogs-stream-prefix" = "ecs-mongo"
        }
      }
    }
  ])
}

# --- ECS Services ---

resource "aws_ecs_service" "mongodb" {
  name            = "csv-app-mongodb-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.mongodb.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.mongodb.arn
  }
}

resource "aws_ecs_service" "api" {
  name            = "csv-app-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_tg.arn
    container_name   = "flask-api"
    container_port   = 5000
  }

  depends_on = [aws_lb_listener.api_listener]
}

resource "aws_ecs_service" "worker" {
  name            = "csv-app-worker-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = true
  }
}

output "alb_url" {
  value = aws_lb.api_alb.dns_name
}
