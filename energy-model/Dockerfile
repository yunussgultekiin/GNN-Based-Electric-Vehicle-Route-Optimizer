FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu
COPY artifacts/ ./artifacts/
COPY src/ ./src/
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8001"]
