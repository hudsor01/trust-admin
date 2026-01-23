#!/usr/bin/env bash
set -euo pipefail

echo "=== Docker Test Environment Verification ==="

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running"
  echo "Please start Docker Desktop and try again"
  exit 1
fi

echo "Docker daemon is running"

# Start services
echo ""
echo "Starting postgres and redis services..."
docker compose up -d postgres redis

# Wait for health checks
echo "Waiting for services to be healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # Check health status using docker inspect
  POSTGRES_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' tenantflow-postgres 2>/dev/null || echo "starting")
  REDIS_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' tenantflow-redis 2>/dev/null || echo "starting")

  if [ "$POSTGRES_HEALTH" = "healthy" ] && [ "$REDIS_HEALTH" = "healthy" ]; then
    echo "All services healthy!"
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS - postgres: $POSTGRES_HEALTH, redis: $REDIS_HEALTH"
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo ""
  echo "ERROR: Services did not become healthy in 60s"
  echo ""
  echo "=== Service logs ==="
  docker compose logs --tail=50
  docker compose down -v
  exit 1
fi

# Verify postgres
echo ""
echo "Verifying PostgreSQL..."
docker compose exec -T postgres pg_isready -U postgres
POSTGRES_VERSION=$(docker compose exec -T postgres psql -U postgres -t -c "SELECT version();" | head -1 | xargs)
echo "  PostgreSQL: $POSTGRES_VERSION"

# Verify redis
echo ""
echo "Verifying Redis..."
REDIS_PONG=$(docker compose exec -T redis redis-cli ping)
if [ "$REDIS_PONG" = "PONG" ]; then
  echo "  Redis: PONG received"
else
  echo "  ERROR: Redis ping failed"
  docker compose down -v
  exit 1
fi

REDIS_VERSION=$(docker compose exec -T redis redis-cli INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
echo "  Redis version: $REDIS_VERSION"

echo ""
echo "=== All services healthy and verified ==="

# Cleanup
echo ""
echo "Cleaning up..."
docker compose down -v

echo ""
echo "=== Docker test environment verification complete ==="
