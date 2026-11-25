---
name: AWS infrastructure for a web app
tagline: A Node.js app on AWS with all of its infrastructure in Terraform and email verification in a serverless function.
status: completed
node: northeastern
tech: [Terraform, AWS, Node.js, GitHub Actions]
links:
  repo: https://github.com/user-profile-terraform-iac
featured: false
order: 6
start: 2024-09
end: 2024-12
---

I built this on my own for CSYE 6225 (Network Structures and Cloud Computing) at Northeastern. It's three
repos:

- `tf-aws-infra`: the AWS infrastructure, all in Terraform.
- `webapp`: a Node.js back end for user profiles.
- `serverless`: a serverless function that verifies new users by email.

CI/CD runs on GitHub Actions.
