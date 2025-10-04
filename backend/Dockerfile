FROM python:3.11-slim-bullseye
WORKDIR /app
# Install system deps required to build Pillow and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential \
	libpq-dev \
	libjpeg-dev \
	zlib1g-dev \
	libfreetype6-dev \
	tesseract-ocr \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel && \
	pip install --no-cache-dir -r requirements.txt

COPY . /app
ENV DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/expense_db
ENV EXCHANGE_API=https://api.exchangerate-api.com/v4/latest/{base}
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
