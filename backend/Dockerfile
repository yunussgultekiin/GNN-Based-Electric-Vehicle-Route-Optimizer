# Python 3.11 slim imajını kullan
FROM python:3.11-slim

# Çalışma dizinini ayarla
WORKDIR /app

# Sistem bağımlılıklarını kur (OSMnx ve NetworkX için bazen C++ derleyicileri gerekebilir, 
# ancak slim imajda sorun yaşanmaması için temel araçları ekliyoruz)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Önce sadece requirements.txt'yi kopyala (Layer Cache optimizasyonu)
COPY requirements.txt .

# Bağımlılıkları yükle (Cache'i temiz tutarak imaj boyutunu küçült)
RUN pip install --no-cache-dir -r requirements.txt

# Şimdi uygulamanın geri kalan kodlarını kopyala
COPY . .

# FastAPI uygulamasını Uvicorn ile başlat
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]