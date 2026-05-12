# 🌱 Eco Mais - Sistema Inteligente de Lixeira para Reciclagem

**Projeto de Startup Green-Tech** | Sistema de Validação Tripla (Usuário + Peso + Visão por IA)

---

## 📋 Visão Geral do Projeto

Eco Mais é um sistema inteligente de reciclagem que combina **hardware ESP32-CAM**, **classificação por visão com IA** e **recompensas gamificadas** para incentivar o descarte correto de resíduos. O sistema usa validação tripla para evitar fraude na geração de pontos:

1. **👤 Sessão do Usuário**: leitura de QR code com timeout de 3 minutos
2. **⚖️ Validação de Peso**: sensor de célula de carga garante pesos realistas
3. **🤖 Visão por IA**: o backend executa um modelo YOLOv8 na imagem enviada pelo ESP32-CAM para classificar os materiais e garantir que eles correspondam ao peso e à categoria informados.

---

## 🏗️ Stack da Arquitetura

- **Backend**: FastAPI (Python 3.11+)
- **Banco de Dados**: MariaDB / MySQL com ORM SQLAlchemy
- **Hardware**: ESP32-CAM + Sensor de Célula de Carga
- **Visão Computacional**: YOLOv8 (Ultralytics) + OpenCV para classificação de materiais recicláveis
- **Autenticação**: tokens JWT + assinaturas HMAC-SHA256 do hardware
- **Tarefas em Segundo Plano**: FastAPI BackgroundTasks (nativo, sem Redis/Celery para o MVP)
- **Armazenamento**: sistema de arquivos local (AWS S3 para produção)

---

## 📁 Estrutura do Projeto

```
eco_mais/
├── models.py              # Modelos de banco de dados SQLAlchemy ✓
├── database.py            # Conexão com o banco e gerenciamento de sessão ✓
├── config.py              # Configuração de ambiente com Pydantic ✓
├── requirements.txt       # Dependências Python ✓
├── .env.example           # Modelo de variáveis de ambiente ✓
├── ARCHITECTURE.md        # Guia completo de arquitetura do sistema ✓
│
├── api/v1/endpoints/      # Handlers das rotas da API (a implementar)
├── services/              # Camada de lógica de negócio (a implementar)
├── ml/models/             # Arquivos do modelo de IA (a treinar)
├── migrations/            # Migrações do banco com Alembic
└── tests/                 # Suite de testes com Pytest
```

---

## 🚀 Início Rápido

### 1. Pré-requisitos

- Python 3.11+
- MariaDB 10.6+ ou MySQL 8.0+
- Hardware ESP32-CAM (para produção)

### 2. Instalação

```bash
# Clonar o repositório
cd Eco_Mais

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Copiar variáveis de ambiente
cp .env.example .env

# Editar o .env com as credenciais do banco
nano .env
```

### 3. Configuração do Banco de Dados

```bash
# Criar o banco MariaDB
mysql -u root -p
CREATE DATABASE eco_mais_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'eco_mais_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON eco_mais_db.* TO 'eco_mais_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Inicializar as tabelas do banco
python database.py

# Ou usar Alembic para migrações (recomendado para produção)
alembic init migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 4. Inserir Dados Iniciais de Materiais

```python
# Create scripts/seed_materials.py
from database import SessionLocal
from models import Material, MaterialCategory

db = SessionLocal()

materials = [
    Material(name="PET Plastic", category=MaterialCategory.PLASTIC,
             points_per_kg=120, ai_class_name="plastic_pet"),
    Material(name="Glass Bottle", category=MaterialCategory.GLASS,
             points_per_kg=80, ai_class_name="glass_clear"),
    Material(name="Aluminum Can", category=MaterialCategory.METAL,
             points_per_kg=200, ai_class_name="metal_aluminum"),
    Material(name="Cardboard", category=MaterialCategory.PAPER,
             points_per_kg=50, ai_class_name="paper_cardboard"),
]

db.add_all(materials)
db.commit()
print("✓ Materiais inseridos com sucesso!")
```

### 5. Executar o Servidor de Desenvolvimento

```bash
# Iniciar o servidor FastAPI
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Acessar a documentação da API
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)

# Testar a verificação de saúde
curl http://localhost:8000/health
```

**Observação:** Para o MVP, as tarefas em segundo plano rodam usando o BackgroundTasks nativo do FastAPI. Para produção em escala, considere migrar para Celery + Redis.

---

## 🔐 Arquitetura de Segurança

### Handshake ESP32 ↔ Backend

O ESP32 se autentica usando assinaturas HMAC-SHA256:

```cpp
// ESP32 Code (C++)
String timestamp = String(now());
String message = BIN_ID + timestamp + jsonPayload;
String signature = hmac_sha256(HARDWARE_API_KEY, message);

httpClient.addHeader("X-Bin-ID", "BIN_001");
httpClient.addHeader("X-Timestamp", timestamp);
httpClient.addHeader("X-Signature", signature);
httpClient.POST("/v1/bin/upload", jsonPayload);
```

**O backend verifica**:

1. Timestamp dentro de ±5 minutos (evita ataques de replay)
2. O bin existe e está ativo
3. A assinatura HMAC corresponde ao valor esperado
4. Todas as requisições são registradas na tabela `audit_logs`

Veja `ARCHITECTURE.md` para os fluxos de segurança detalhados.

---

## 🛡️ Fluxo de Validação Tripla

![Fluxograma](docs/diagramas/Untitled%20Diagram.drawio%20copy.svg)

```
Usuário Escaneia QR → Sessão Criada (timeout de 3 min)
                     ↓
Usuário Deposita Item → Peso Medido (Célula de Carga)
                     ↓
ESP32-CAM Captura → Envio para /v1/bin/upload (200 OK retornado imediatamente)
                     ↓
Processamento por IA em Segundo Plano → Classificação (YOLOv8)
                     ↓
Todos os 3 Válidos? → Pontos Atribuídos → Usuário Notificado
```

**Processamento em Segundo Plano (MVP):**

- A classificação por IA roda em FastAPI BackgroundTasks
- O ESP32 recebe resposta 200 OK imediata (sem espera)
- Os pontos são atribuídos de forma assíncrona após a conclusão da IA
- Para produção em escala: migrar para Celery + Redis

**Mecanismos Anti-Fraude**:

- Limite de requisições (10 descartes/sessão, 100/dia)
- Detecção de imagem duplicada (hash perceptual) _[MVP: Placeholder]_
- Detecção de anomalia de peso (detecção de outliers por ML) _[MVP: Placeholder]_
- Enforço do timeout da sessão (checado a cada requisição)
- Fila de revisão manual para classificações com baixa confiança _[Futuro]_

---

## 📊 Esquema do Banco de Dados

### Tabelas Principais

**Users**: gerenciamento de contas, rastreamento de pontos
**SmartBins**: registro do hardware, chaves de API, localização
**ActiveSessions**: janelas de reciclagem de 3 minutos
**Materials**: catálogo de materiais recicláveis, taxa de pontos
**Discards**: registros de validação tripla, flags de fraude
**Rewards**: ledger de transações de pontos
**AuditLog**: registro de eventos de segurança

Veja `models.py` para o esquema completo com relacionamentos.

---

## 🤖 Integração do Modelo de IA

### Treinando seu Modelo

```python
# 1. Coletar dataset rotulado
#    - 10.000+ imagens por categoria de material
#    - Iluminação, ângulos e fundos variados
#    - Anotar no formato YOLO (bounding boxes)

# 2. Treinar modelo de classificação YOLOv8
from ultralytics import YOLO

# Carregar modelo pré-treinado
model = YOLO('yolov8n-cls.pt')  # Modelo nano para velocidade

# Treinar no seu dataset
results = model.train(
    data='path/to/dataset',
    epochs=100,
    imgsz=224,
    batch=16
)

# Salvar modelo
model.save('ml/models/recyclable_classifier.pt')

# 3. Exportar para deploy (opcional)
model.export(format='onnx')  # Para otimização em produção
```

### Classes de Materiais Esperadas

```python
CLASSES = [
    "plastic_pet", "plastic_hdpe",
    "glass_clear", "glass_colored",
    "paper_cardboard", "paper_newspaper",
    "metal_aluminum", "metal_steel",
    "organic", "electronic", "non_recyclable"
]
```

---

## 🧪 Testes

```bash
# Executar todos os testes
pytest

# Executar com cobertura
pytest --cov=. --cov-report=html

# Testar módulos específicos
pytest tests/test_validation.py -v
pytest tests/test_security.py -v
```

---

## 📱 Endpoints da API

### Endpoints Implementados ✅

- `GET /health` - Verificação de saúde do sistema
- `POST /v1/bin/upload` - ⭐ **Endpoint de Validação Tripla para ESP32**
- `POST /v1/bin/heartbeat` - Reporte de status do bin

### A Implementar

#### Endpoints Públicos

- `POST /v1/auth/register` - Registro de usuário
- `POST /v1/auth/login` - Autenticação JWT
- `GET /v1/materials` - Lista de materiais recicláveis

#### Endpoints do Usuário (JWT obrigatório)

- `POST /v1/sessions/start` - Iniciar sessão de reciclagem (leitura do QR)
- `GET /v1/users/me` - Obter perfil do usuário e pontos
- `GET /v1/discards/history` - Histórico de reciclagem do usuário

#### Endpoints de Admin

- `GET /v1/admin/bins` - Gerenciar smart bins
- `GET /v1/admin/flagged-discards` - Revisar atividades suspeitas

---

## 🎯 Próximos Passos

### Fase 1: Desenvolvimento do Backend

- [x] ✅ Implementar endpoint `/v1/bin/upload` com BackgroundTasks
- [x] ✅ Implementar serviço de validação tripla
- [ ] Criar endpoints de gerenciamento de sessão (`/v1/sessions/start`)
- [ ] Criar autenticação de usuário (JWT)
- [ ] Implementar endpoints do usuário (`/v1/users/me`, histórico)

### Fase 2: Firmware do ESP32

- [ ] Implementar geração de assinatura HMAC
- [ ] Integrar captura da câmera
- [ ] Conectar o sensor de peso da célula de carga
- [ ] Adicionar lógica de retry para uploads com falha

### Fase 3: Modelo de IA

- [ ] Coletar dataset de treinamento (10k+ imagens)
- [ ] Treinar classificador YOLOv8 (yolov8n-cls ou yolov8s-cls)
- [ ] Atingir >85% de acurácia no conjunto de validação
- [ ] Implantar o modelo no backend (FastAPI servindo inferência)

### Fase 4: App Mobile

- [ ] Scanner de QR code (início da sessão)
- [ ] Exibição de pontos em tempo real
- [ ] Histórico e estatísticas de descarte
- [ ] Ranking

### Fase 5: Painel Administrativo

- [ ] Dashboard de monitoramento dos bins
- [ ] Fila de revisão de detecção de fraude
- [ ] Analytics (padrões de reciclagem, engajamento do usuário)

---

## 📖 Documentação

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Design completo do sistema, fluxos de segurança, lógica de validação
- **[models.py](models.py)** - Modelos SQLAlchemy do banco com relacionamentos
- **[config.py](config.py)** - Referência de configuração de ambiente

---

## 🤝 Contribuindo

Este é um projeto de TCC (trabalho de conclusão de curso). Contribuições são bem-vindas!

1. Faça um fork do repositório
2. Crie uma branch de feature (`git checkout -b feature/new-feature`)
3. Faça commit das mudanças (`git commit -m 'Add new feature'`)
4. Envie para a branch (`git push origin feature/new-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Licença MIT - veja o arquivo LICENSE para detalhes.

---

## 👤 Autor

**Paulo Eduardo** - Green-Tech Startup (Projeto TCC)

---

## 🙏 Agradecimentos

- FastAPI framework
- ORM SQLAlchemy
- Ultralytics YOLOv8
- Comunidade OpenCV
- Ecossistema open-source do ESP32

---

**Feito com 💚 por um futuro sustentável**
