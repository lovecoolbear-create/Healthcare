# uniCloud Alipay - HBuilderX/uniCloud Web Console - Manual Deployment Guide

## Quick Deployment Steps

### 1. Using HBuilderX (Recommended)
1. Open HBuilderX
2. Open project: `/Users/blair/HealthCare/Healthcare2.0/health-pro-mp`
3. Right-click `uniCloud-alipay` folder
4. Select "Upload Cloud Functions"
5. Select all functions:
   - user-center
   - client-api
   - common
   - auto-backup
6. Click Upload

### 2. Using uniCloud Web Console
1. Login to [uniCloud Console](https://unicloud.dcloud.net.cn/)
2. Select Alipay Cloud space: `env-00jy5xpjho0v`
3. For each function:
   - Click "Upload Cloud Function"
   - Upload entire folder (e.g., `user-center/`)
   - Wait for deployment

### 3. Functions to Deploy

#### user-center
- Path: `uniCloud-alipay/cloudfunctions/user-center/`
- Contains: Password compatibility fix
- Status: Ready for deployment

#### client-api
- Path: `uniCloud-alipay/cloudfunctions/client-api/`
- Contains: Security middleware integration
- Status: Ready for deployment

#### common
- Path: `uniCloud-alipay/cloudfunctions/common/`
- Contains: Security utilities
- Status: Ready for deployment

#### auto-backup
- Path: `uniCloud-alipay/cloudfunctions/auto-backup/`
- Contains: Database backup
- Status: Ready for deployment

## After Deployment

1. Clear browser cache
2. Test login with account: `17721199471`
3. Verify dashboard loads correctly
4. Check page navigation maintains login state

## Troubleshooting

If deployment fails:
- Check spaceId matches: `env-00jy5xpjho0v`
- Ensure all dependencies in package.json
- Verify no syntax errors in function files
- Check Alipay cloud service is active

## Testing Checklist

- [ ] Login successful
- [ ] Token persists across pages
- [ ] Dashboard loads without errors
- [ ] Navigation works correctly
- [ ] No "login state invalid" errors
