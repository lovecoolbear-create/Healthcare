#!/bin/bash

# uniCloud Alipay Cloud Functions Deployment Script
# Author: Cascade AI Assistant
# Date: $(date)

echo "=== uniCloud Alipay Cloud Functions Deployment ==="
echo

# Set project path
PROJECT_DIR="/Users/blair/HealthCare/Healthcare2.0/health-pro-mp"
CLOUD_DIR="$PROJECT_DIR/uniCloud-alipay/cloudfunctions"

echo "Project Directory: $PROJECT_DIR"
echo "Cloud Functions Directory: $CLOUD_DIR"
echo

# Check if directories exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo "ERROR: Project directory not found: $PROJECT_DIR"
    exit 1
fi

if [ ! -d "$CLOUD_DIR" ]; then
    echo "ERROR: Cloud functions directory not found: $CLOUD_DIR"
    exit 1
fi

# List all cloud functions
echo "Available Cloud Functions:"
ls -la "$CLOUD_DIR"
echo

# Check each function has required files
echo "=== Checking Cloud Function Structure ==="
for func_dir in "$CLOUD_DIR"/*; do
    if [ -d "$func_dir" ]; then
        func_name=$(basename "$func_dir")
        echo "Checking: $func_name"
        
        if [ -f "$func_dir/index.js" ]; then
            echo "  - index.js: OK"
        else
            echo "  - index.js: MISSING"
        fi
        
        if [ -f "$func_dir/package.json" ]; then
            echo "  - package.json: OK"
        else
            echo "  - package.json: MISSING"
        fi
        echo
    fi
done

echo "=== Deployment Instructions ==="
echo
echo "Option 1: Using HBuilderX (Recommended)"
echo "1. Open HBuilderX"
echo "2. Open project: $PROJECT_DIR"
echo "3. Right-click 'uniCloud-alipay' folder"
echo "4. Select 'Upload Cloud Functions'"
echo "5. Select all functions and upload"
echo
echo "Option 2: Using uniCloud Web Console"
echo "1. Login to: https://unicloud.dcloud.net.cn/"
echo "2. Select Alipay Cloud space: env-00jy5xpjho0v"
echo "3. Upload each function folder individually"
echo
echo "Functions to deploy:"
for func_dir in "$CLOUD_DIR"/*; do
    if [ -d "$func_dir" ]; then
        func_name=$(basename "$func_dir")
        echo "  - $func_name"
    fi
done
echo
echo "After deployment, please test:"
echo "1. Login with account: 17721199471"
echo "2. Check dashboard loads correctly"
echo "3. Verify page navigation maintains login state"
echo
echo "=== End of Deployment Guide ==="
