provider "aws" {
  region  = "us-east-2"
  profile = "default"
}

data "aws_elb_service_account" "main" {}

data "aws_iam_policy_document" "bucket_policy" {
  statement {
    actions = [
      "s3:PutObject",
    ]

    effect = "Allow"

    resources = [
      "arn:aws:s3:::nallas-alb-logs-bucket-062618/*",
      "arn:aws:s3:::nallas-alb-logs-bucket-062618",
    ]

    principals {
      identifiers = [
        "${data.aws_elb_service_account.main.arn}",
      ]

      type = "AWS"
    }
  }
}

resource "aws_s3_bucket" "alb_logs" {
  bucket = "nallas-alb-logs-bucket-062618"
  acl    = "log-delivery-write"
  policy = "${data.aws_iam_policy_document.bucket_policy.json}"

  tags {
    Name = "Nallas bucket to test websocket"
  }
}

// create security group similar to the ones we have 
resource "aws_security_group" "alb_sg" {
  name   = "$nallas-alb-sg"
  vpc_id = "${var.vpc_id}"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ec2_sg" {
  name   = "$ec2-sg"
  vpc_id = "${var.vpc_id}"

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "6"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "6"
    cidr_blocks = ["12.106.136.114/32"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "6"
    cidr_blocks = ["207.181.205.25/32"]
  }
}

// create auto scalling group. this is for the instance level. hence healthcheck type is EC2
resource "aws_autoscaling_group" "nallas-asg" {
  name                = "nallas-asg"
  max_size            = 3
  min_size            = 3
  desired_capacity    = 3
  health_check_type   = "EC2"
  vpc_zone_identifier = ["${var.subnet1}", "${var.subnet2}", "${var.subnet3}"]

  // tie instances to target group and launch configuration for the cluster
  launch_configuration = "${aws_launch_configuration.asg.id}"
}

// create launch configuration
resource "aws_launch_configuration" "asg" {
  name = "backend-services-lc"

  // normal ec2 instance
  // image_id = "ami-922914f7"
  // ecs optimized image. this image is different from the one we use in terraform modules
  image_id = "ami-956e52f0"

  instance_type        = "t2.micro"
  iam_instance_profile = "${var.ecs_arn}"
  security_groups      = ["${aws_security_group.ec2_sg.id}"]
  key_name             = "nallas-key"
  user_data            = "${data.template_file.user_data_cluster.rendered}"
}

data "template_file" "user_data_cluster" {
  template = "${file("${path.module}/user_data_cluster.sh.template")}"

  vars {
    cluster_name = "backend-ecs"
  }
}

// create docker file - in the `/server` folder
// create docker binary - on my local drive

// create ecr repo
resource "aws_ecr_repository" "backend_ecr" {
  name = "backend-ecr-repo"
}

// push binary to ecr - done

// create task definition
resource "aws_ecs_task_definition" "backend-svc" {
  family                = "backend-service"
  container_definitions = "${file("task-definition.json")}"
  network_mode          = "host"
  task_role_arn         = "${var.profile_arn}"
}

// create service 
resource "aws_ecs_service" "backend-svc" {
  // depends_on = ["aws_alb_target_group.service-tg"]
  name                               = "backend-svc"
  cluster                            = "${aws_ecs_cluster.backend-ecs.arn}"
  task_definition                    = "${aws_ecs_task_definition.backend-svc.arn}"
  desired_count                      = "3"
  iam_role                           = "${var.service_role}"
  deployment_minimum_healthy_percent = "60"
  deployment_maximum_percent         = "200"

  load_balancer {
    container_name   = "${aws_ecs_task_definition.backend-svc.family}"
    container_port   = "3000"
    target_group_arn = "${aws_alb_target_group.backend-services.arn}"
  }
}

// create cluster/config
resource "aws_ecs_cluster" "backend-ecs" {
  name = "backend-ecs"
}

// link service to alb and target group. to do this, you need to do everything below

// create alb for container
resource "aws_alb" "backend_svc_alb" {
  name               = "backend-svc-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = ["${var.subnet1}", "${var.subnet2}", "${var.subnet3}"]
  security_groups    = ["${aws_security_group.alb_sg.id}"]

  access_logs {
    bucket  = "${aws_s3_bucket.alb_logs.bucket}"
    prefix  = "backend_svc_alb"
    enabled = true
  }
}

// create alb listener for container
resource "aws_alb_listener" "backend-services" {
  load_balancer_arn = "${aws_alb.backend_svc_alb.arn}"
  port              = 80
  protocol          = "HTTP"

  default_action {
    target_group_arn = "${aws_alb_target_group.backend-services.arn}"
    type             = "forward"
  }
}

// create alb listener rule for container
resource "aws_alb_listener_rule" "backend-services" {
  listener_arn = "${aws_alb_listener.backend-services.arn}"
  priority     = 1

  condition {
    field  = "path-pattern"
    values = ["/"]
  }

  action {
    target_group_arn = "${aws_alb_target_group.backend-services.arn}"
    type             = "forward"
  }
}

// create target group for container
resource "aws_alb_target_group" "backend-services" {
  name     = "backend-services-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = "${var.vpc_id}"

  // slow_start = 30
  health_check {
    path                = "/healthcheck"
    port = 3000
    unhealthy_threshold = 2
    matcher             = "200-310"
  }
}

// create asg for container
resource "aws_appautoscaling_target" "service" {
  max_capacity = "3"
  min_capacity = "3"
  resource_id  = "service/backend-ecs/${aws_ecs_service.backend-svc.name}"

  // role_arn = "${var.autoscaling_role}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
