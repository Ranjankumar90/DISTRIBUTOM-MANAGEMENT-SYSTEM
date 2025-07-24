#!/bin/bash
set -e

# Build backend Docker image
echo "Building backend Docker image..."
docker build -t backend:local ./backend

# Build frontend Docker image
echo "Building frontend Docker image..."
docker build -t frontend:local ..

# Load images into Minikube
echo "Loading images into Minikube..."
minikube image load backend:local
minikube image load frontend:local

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -f k8s-backend-config.yaml
kubectl apply -f k8s-frontend-config.yaml
kubectl apply -f k8s-backend-pvc.yaml
kubectl apply -f k8s-backend-deployment.yaml
kubectl apply -f k8s-frontend-deployment.yaml
kubectl apply -f k8s-ingress.yaml

echo "Deployment complete!" 