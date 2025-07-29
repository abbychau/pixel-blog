# PM2 Production Server Setup

## Prerequisites
Make sure PM2 is installed globally:
```bash
npm install -g pm2
```

## Usage

### 1. Build the application for production
```bash
npm run build:prod
```

This creates a separate `.next-prod` directory so you can run dev and prod simultaneously.

### 2. Start the production server with PM2
```bash
npm run pm2:start
```

### 3. Check server status
```bash
npm run pm2:status
```

### 4. View logs
```bash
npm run pm2:logs
```

### 5. Restart the server
```bash
npm run pm2:restart
```

### 6. Stop the server
```bash
npm run pm2:stop
```

### 7. Delete the process (completely remove)
```bash
npm run pm2:delete
```

## Configuration Details

- **Server Name**: `pixel-blog`
- **Port**: `55679` (production)
- **Environment**: `production`
- **Memory Limit**: `1GB`
- **Auto-restart**: Enabled
- **Cluster Mode**: Single instance
- **Logs Location**: `./logs/`

## Log Files
- Error logs: `./logs/pm2-error.log`
- Output logs: `./logs/pm2-out.log`
- Combined logs: `./logs/pm2-combined.log`

## Access Your Application
After starting with PM2, your blog will be available at:
- **Development**: http://localhost:55678 (when running `npm run dev`)
- **Production**: http://localhost:55679 (when running PM2)

## Running Both Dev and Prod Simultaneously
Thanks to separate build directories, you can now run:

```bash
# Terminal 1: Development server
npm run dev

# Terminal 2: Build and start production
npm run build:prod
npm run pm2:start
```

- Dev server uses `.next` directory
- Prod server uses `.next-prod` directory
- No conflicts between the two!

## Advanced PM2 Commands
```bash
# Start with environment
pm2 start pm2.config.json --env production

# Monitor in real-time
pm2 monit

# Save PM2 configuration (auto-start on boot)
pm2 save
pm2 startup

# Reload with zero downtime
pm2 reload pixel-blog
```