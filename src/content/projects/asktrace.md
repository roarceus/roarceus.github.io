---
name: askTRACE
tagline: Pulls insights out of Northeastern's course evaluation surveys with Kafka, GKE, and RAG.
status: completed
node: northeastern
tech: [Go, Python, Kafka, Kubernetes, Helm, GKE, GCP, Terraform, Jenkins, RAG]
links:
  repo: https://github.com/trace-survey-analysis
  demo: https://www.youtube.com/watch?v=VntctukuTwA
featured: true
order: 1
start: 2025-01
end: 2025-04
---

askTRACE processes Northeastern's TRACE (Teacher Rating And Course Evaluation) survey data and answers
questions about it using retrieval-augmented generation (RAG).

We were a team of two for CSYE 7125, and I worked on almost all of the 13 repos:

- Go and Python services talking over Kafka, running on Google Kubernetes Engine.
- GCP infrastructure in Terraform.
- Helm charts for the services, plus a Kubernetes operator for backups.
- Jenkins CI for the whole system.

The demo video walks through it end to end.
