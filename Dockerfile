# Backend image. Binds $PORT, which container hosts inject at runtime.
FROM python:3.12-slim

WORKDIR /code
COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv \
    && uv export --no-dev --frozen --format requirements.txt > requirements.txt \
    && pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y uv

# The knowledge base lives in MongoDB Atlas at runtime; kb/ is build-time only.
COPY app ./app

ENV PORT=8000
EXPOSE 8000
# Shell form so $PORT expands; hosts assign it and it is not known at build time.
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
