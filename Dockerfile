FROM python:3.12-slim

WORKDIR /app

# Copy dependency files
COPY pyproject.toml /app/
COPY requirements.txt /app/

# Install dependencies - make sure we have the latest pip
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py /app/
COPY templates/ /app/templates/

# Expose the port
EXPOSE 5000

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "server:app"]