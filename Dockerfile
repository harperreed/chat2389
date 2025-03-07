FROM node:20-slim as frontend-builder

WORKDIR /app

# Copy frontend source
COPY . /app/

# Install Node.js dependencies
RUN npm install

# Build the frontend
RUN npm run build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Expose the port
EXPOSE 5000

# Run with gunicorn for production
CMD ["uv","run","gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--access-logfile", "-", "server:app"]
