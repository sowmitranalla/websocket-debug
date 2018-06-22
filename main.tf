provider "aws" {
  region = "us-east-2"
  profile = "default"
}

resource "aws_alb" "nalla-debug-alb" {
  name = "nalla-debug-alb"
  internal = false
  load_balancer_type = "application"
  subnets = ["${var.subnet1}", "${var.subnet2}", "${var.subnet3}"]
  security_groups = ["${var.sg_id}"]
}

// create security group similar to the ones we have 

// create ALB listener 
resource "aws_alb_listener" "backend-services" {
  load_balancer_arn = "${aws_alb.nalla-debug-alb.arn}"
  port = 80
  protocol = "HTTP" 
  default_action {
    target_group_arn = "${aws_alb_target_group.backend-services.arn}"
    type = "forward"
  }
}

resource "aws_alb_listener_rule" "backend-services" {
  listener_arn = "${aws_alb_listener.backend-services.arn}"
  priority = 1
  condition {
    field = "path-pattern"
    values = ["/"]
  }
  action {
    target_group_arn = "${aws_alb_target_group.backend-services.arn}"
    type = "forward"
  }
}

// create ALB target
resource "aws_alb_target_group" "backend-services" {
  name     = "backend-services-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = "${var.vpc_id}"
  // slow_start = 30
  health_check {
    path = "/healthcheck"
  }
}


// create auto scalling group
resource "aws_autoscaling_group" "nallas-asg" {
  name = "nallas-asg"
  max_size = 4
  min_size = 3
  desired_capacity = 3
  health_check_type = "ELB"
  vpc_zone_identifier = ["${var.subnet1}", "${var.subnet2}", "${var.subnet3}"]
  // tie instances to target group
  target_group_arns = ["${aws_alb_target_group.backend-services.arn}"]
  launch_configuration = "${aws_launch_configuration.asg.id}"
}


// create launch configuration
resource "aws_launch_configuration" "asg" {
  name = "backend-services-lc"
  image_id = "ami-922914f7"
  instance_type = "t2.micro"
  security_groups = ["${var.sg_id}"]
  key_name = "nallas-key"
  // user_data = ""

}

data "template_file" "user_data" {
  template = "${file("${path.module}/user_data.sh.template")}"

}

