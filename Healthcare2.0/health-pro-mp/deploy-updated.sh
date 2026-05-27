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

echo "=== Cloud Functions Ready for Deployment ==="
echo "These are the actual cloud functions (common is a shared module):"
echo

# Check each function has required files
for func_dir in "$CLOUD_DIR"/*; do
    if [ -d "$func_dir" ]; then
        func_name=$(basename "$func_dir")
        
        # Skip common directory (it's a shared module)
        if [ "$func_name" = "common" ]; then
            echo "Skipping: $func_name (shared module, not a cloud function)"
            continue
        fi
        
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
echo "5. Select these functions and upload:"
echo "   - user-center"
echo "   - client-api"
echo "   - auto-backup"
echo "   - protocol-effectiveness"
echo "   (common is a shared module, don't upload it separately)"
echo
echo "Option 2: Using uniCloud Web Console"
echo "1. Login to: https://unicloud.dcloud.net.cn/"
echo "2. Select Alipay Cloud space: env-00jy5xpjho0v"
echo "3. Upload each function folder individually:"
echo "   - user-center/"
echo "   - client-api/"
echo "   - auto-backup/"
echo "   - protocol-effectiveness/"
echo
echo "=== Key Functions and Their Purpose ==="
echo "user-center: Login, registration, password compatibility fix"
echo "client-api: Business logic with security middleware"
echo "auto-backup: Database backup automation"
echo "protocol-effectiveness: Health protocol tracking"
echo "common: Shared utilities (security.js, etc.) - referenced by other functions"
echo
echo "=== After Deployment ==="
echo "Please test:"
echo "1. Clear browser cache"
echo "2. Login with account: 17721199471"
echo "3. Check dashboard loads correctly"
echo "4. Verify page navigation maintains login state"
echo "5. Check no 'token missing' errors"
echo
echo "=== End of Deployment Guide ==="
