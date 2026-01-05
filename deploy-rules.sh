#!/bin/bash

# Script to deploy Firestore security rules
# Usage: ./deploy-rules.sh

set -e

echo "🔐 Firestore Security Rules Deployment"
echo "======================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if logged in
if ! firebase login:list &> /dev/null || [ -z "$(firebase login:list 2>/dev/null | grep -v 'No authorized')" ]; then
    echo "⚠️  Not logged in to Firebase. Please login..."
    echo "   This will open a browser window."
    firebase login
    echo ""
fi

# Verify project configuration
if [ ! -f "firebase.json" ] || [ ! -f ".firebaserc" ]; then
    echo "❌ Firebase configuration files not found!"
    exit 1
fi

# Verify rules file exists
if [ ! -f "firestore.rules" ]; then
    echo "❌ firestore.rules file not found!"
    exit 1
fi

echo "✅ Configuration verified"
echo ""
echo "📤 Deploying Firestore security rules..."
echo ""

# Deploy rules
firebase deploy --only firestore:rules

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 Verify in Firebase Console:"
echo "   https://console.firebase.google.com/project/plannercli/firestore/rules"
echo ""

