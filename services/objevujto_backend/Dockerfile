FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY app ./app
COPY data ./data

EXPOSE 8787
CMD ["python3", "-m", "app"]
