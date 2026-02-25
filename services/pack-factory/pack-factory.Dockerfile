FROM python:3.11-slim

WORKDIR /workspace

COPY services/pack-factory/requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -r /workspace/requirements.txt

COPY . /workspace

ENV PYTHONPATH=/workspace/services/pack-factory:/workspace

ENTRYPOINT ["python","-m","app.cli"]
