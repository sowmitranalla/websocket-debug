

The terraform scripts in this repo will create an ALB, ASG, launch config, instances, etc. The backend code will let ALB know things are going fine and accept web socket requests

### To run the terraform script: 

* create a file called `terraform.tfvars`
* fill above file with the variables defined in `variables.tf`
* `terraform init && terraform apply`
* `terraform destroy` after you're done toying/testing 