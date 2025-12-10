# Database Configuration Guide

## Local Development (Docker)

Use individual connection parameters:

```env
PORT=6070
DATABASE_HOST=postgres  # or localhost if not using Docker
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=wallet_db
DATABASE_SSL=false
```

## Cloud Database (Leapcell.io, Heroku, etc.)

Use DATABASE_URL for cloud providers:

```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
DATABASE_SSL=true
```

**Example for Leapcell:**
```env
DATABASE_URL=postgresql://user:pass@9qasp5v56q8ckkf5dc.leapcellpool.com:6438/dbname?sslmode=require
DATABASE_SSL=true
```

## How It Works

1. **DATABASE_URL takes precedence**: If `DATABASE_URL` is set, individual params are ignored
2. **SSL is auto-enabled** when using `DATABASE_URL`
3. **SSL can be forced** by setting `DATABASE_SSL=true`
4. **Local development** uses `DATABASE_SSL=false` by default

## Configuration Priority

```
DATABASE_URL (if exists)
  ↓
Auto-enable SSL
  ↓
Use URL for connection
```

OR

```
Individual params (HOST, PORT, etc.)
  ↓
Check DATABASE_SSL flag
  ↓
Use params for connection
```

## Switching Between Environments

### For Local Development:
```env
# Comment out DATABASE_URL
# DATABASE_URL=...

# Use individual params
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=0951
DATABASE_NAME=wallet_db
DATABASE_SSL=false
```

### For Leapcell Production:
```env
# Use DATABASE_URL
DATABASE_URL=postgresql://user:pass@9qasp5v56q8ckkf5dc.leapcellpool.com:6438/dbname?sslmode=require
DATABASE_SSL=true

# Individual params are optional when DATABASE_URL is set
```

## SSL Configuration

The app automatically configures SSL with:
```typescript
ssl: {
  rejectUnauthorized: false
}
```

This is required for most cloud PostgreSQL providers including:
- Leapcell.io
- Heroku Postgres
- Railway
- Render
- Supabase

## Troubleshooting

### "ENOTFOUND" error
- Check that `DATABASE_URL` is correct
- Verify host is accessible

### "SSL required" error
- Set `DATABASE_SSL=true`
- Ensure `?sslmode=require` is in `DATABASE_URL`

### "Connection refused" error (local)
- Make sure PostgreSQL is running
- Check `DATABASE_HOST` (use `localhost` not `postgres` if not using Docker)
- Verify port is correct (default: 5432)

### Works locally but not in cloud
- Ensure `DATABASE_SSL=true` for cloud
- Check that connection URL includes `?sslmode=require`
