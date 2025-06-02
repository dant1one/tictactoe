#!/bin/bash

# Деплой TicTacToe приложения на Google Cloud Platform

echo "🚀 Starting deployment to Google Cloud Platform..."

# Проверяем, что Google Cloud SDK установлен
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Проверяем, что пользователь авторизован
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with Google Cloud. Please run: gcloud auth login"
    exit 1
fi

# Получаем текущий проект
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project set. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📦 Project ID: $PROJECT_ID"

# Создаем директорию для данных (если нужно)
mkdir -p data

# Собираем приложение
echo "🔨 Building application..."
./mvnw clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Деплоим на App Engine
echo "🌟 Deploying to App Engine..."
gcloud app deploy app.yaml --quiet

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your app is available at: https://$PROJECT_ID.appspot.com"
    echo "📊 Statistics page: https://$PROJECT_ID.appspot.com/stats"
    echo "🔍 View logs: gcloud app logs tail -s default"
else
    echo "❌ Deployment failed"
    exit 1
fi
