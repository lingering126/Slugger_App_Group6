#!/bin/bash

# Simple deploy script for Slugger app

echo "📦 Preparing to deploy Slugger app to Render..."

# Check if Git is installed
if ! [ -x "$(command -v git)" ]; then
  echo "❌ Error: Git is not installed."
  exit 1
fi

# Check if we're in a Git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌ Error: Not in a Git repository."
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
echo "📋 Current branch: $CURRENT_BRANCH"

# Commit changes
echo "💾 Committing changes..."
git add .
git commit -m "Fix email verification system and improve error handling"

# Push to origin
echo "🚀 Pushing to origin/$CURRENT_BRANCH..."
git push origin $CURRENT_BRANCH

echo "✅ Deploy complete! Changes should be live on Render soon."
echo "🔗 Check your site at: https://slugger-app-group6.onrender.com"
echo "📝 Remember to wait a few minutes for the build to complete on Render." 