# Use the official Python 3.12 slim image as the base image.
FROM python:3.12-slim

# Copy the 'uv' binary (a fast Python package manager/runner) from the official container registry to the image.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set the working directory in the container to /app
WORKDIR /app

# Copy the dependency configuration file (PEP 621/Poetry-style) into the container
COPY pyproject.toml ./

# Copy all Python files (e.g., app.py, my_server.py) into the working directory
COPY *.py ./

# Create necessary directory structure for database and logs
RUN mkdir -p /app/data /app/logs

# Copy local `data` folder (likely containing a pre-filled SQLite DB or similar) into the image
COPY data/ /app/data/

# Copy local `logs` folder (to persist or read existing logs) into the image
COPY logs/ /app/logs/

# Install project dependencies (excluding dev dependencies) using uv
RUN uv sync --no-dev

# Set read-execute permissions for all users on data and logs folders
RUN chmod -R 755 /app/data /app/logs

# Add virtual environment bin directory to PATH (if uv or project creates .venv)
ENV PATH="/app/.venv/bin:$PATH"

# Expose port 8080 to allow external access to the application
EXPOSE 8080

# Set the default command to run the application using `uv run`, which serves my_server.py
CMD ["uv", "run", "my_server.py"]
