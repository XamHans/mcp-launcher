# Use the official Python lightweight image
FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install the project into /app
COPY . /app
WORKDIR /app

# Allow statements and log messages to immediately appear in the logs
ENV PYTHONUNBUFFERED=1

# Install dependencies using uv sync (pyproject.toml detected)
RUN uv sync --no-dev

EXPOSE $PORT

# Run the MCP server
CMD ["uv", "run", "math_bot.py"]
