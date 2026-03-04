# db.tf

# --- Security Group for DocumentDB ---
resource "aws_security_group" "docdb_sg" {
  name        = "csv-app-docdb-sg"
  description = "Allow inbound MongoDB traffic from ECS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- DocumentDB Cluster ---
resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "csv-app-docdb-cluster"
  engine                  = "docdb"
  master_username         = "adminuser"
  master_password         = "password123" # In production, use a secret manager
  backup_retention_period = 5
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot     = true
  vpc_security_group_ids  = [aws_security_group.docdb_sg.id]
  db_subnet_group_name    = aws_docdb_subnet_group.main.name
}

resource "aws_docdb_cluster_instance" "cluster_instances" {
  count              = 1
  identifier         = "csv-app-docdb-instance"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = "db.t3.medium"
}

resource "aws_docdb_subnet_group" "main" {
  name       = "csv-app-docdb-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "My docdb subnet group"
  }
}

output "docdb_endpoint" {
  value = aws_docdb_cluster.main.endpoint
}
