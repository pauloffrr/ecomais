# Smart Recycling Bin - Arquitetura do Sistema

## 1. Visão Geral do Esquema de Banco de Dados

### Tabelas Principais

#### **Users**

- Gerencia contas de usuários e recompensas acumuladas
- Controla o total de pontos e a contagem de descartes para gamificação
- Verificação de e-mail e status da conta para segurança

#### **SmartBins**

- Representa as lixeiras físicas equipadas com ESP32-CAM
- Armazena a chave de API do hardware para autenticação
- Controla localização, capacidade e status operacional
- Monitora a versão do firmware e a última comunicação

#### **ActiveSessions** (timeout de 3 minutos)

- **Crítico para a validação tripla**
- Faz o vínculo usuário → lixeira → sessão de reciclagem atual
- Expira automaticamente após 3 minutos para evitar abuso
- Rastreia checkpoints de validação (leitura do QR, peso, visão por IA)
- Usa o campo indexado `expires_at` para consultas de limpeza eficientes

#### **Materials**

- Dados mestres para os tipos de materiais recicláveis
- Define as taxas de recompensa em pontos por kg
- Armazena mapeamentos de classificação por IA e limiares de confiança
- Permite atualizações dinâmicas do catálogo de materiais

#### **Discards**

- **Checkpoint da validação tripla** (ver seção 4)
- Registra peso, imagem e classificação por IA
- Evita injeção de pontos por meio de flags de detecção de fraude
- Trilho de auditoria imutável de todos os eventos de reciclagem

#### **Rewards**

- Ledger de transações de pontos (ganho/resgate)
- Relaciona-se aos descartes para rastreabilidade
- Permite resgate de pontos e campanhas de bônus

#### **AuditLog**

- Registro de segurança para todas as requisições do ESP32
- Armazena assinaturas HMAC para análise forense
- Controla endereços IP e padrões de requisição

---

## 2. Handshake de Segurança (ESP32 ↔ Backend)

### Fluxo de Autenticação

```
┌─────────┐                  ┌─────────────┐                ┌──────────┐
│ ESP32   │                  │ Backend API │                │ Database │
│ CAM     │                  │ (FastAPI)   │                │ (MariaDB)│
└────┬────┘                  └──────┬──────┘                └────┬─────┘
     │                              │                            │
     │ 1. POST /v1/bin/upload       │                            │
     │    Headers:                  │                            │
     │    - X-Bin-ID: BIN_001       │                            │
     │    - X-Timestamp: 1234567890 │                            │
     │    - X-Signature: HMAC       │                            │
     │ ─────────────────────────────>                            │
     │                              │                            │
     │                         2. Validar Timestamp            │
     │                            (janela de ±5 min)           │
     │                              │                            │
     │                         3. Consultar API Key           │
     │                              │ ───────────────────────────>
     │                              │ <───────────────────────────
     │                              │    hardware_api_key         │
     │                              │                            │
     │                         4. Calcular HMAC-SHA256         │
     │                            signature = HMAC(              │
     │                              key=api_key,                 │
     │                              msg=bin_id+timestamp+body    │
     │                            )                              │
     │                              │                            │
     │                         5. Comparar Assinaturas         │
     │                            (comparação segura contra timing)
     │                              │                            │
     │ <─────────────────────────────                            │
     │    200 OK / 401 Unauthorized │                            │
     │                              │                            │
```

### Detalhes de Implementação

**Lado ESP32 (C/C++):**

```cpp
// Pseudo-código para o ESP32
String timestamp = String(now());
String message = BIN_ID + timestamp + jsonBody;
String signature = hmac_sha256(HARDWARE_API_KEY, message);

httpClient.addHeader("X-Bin-ID", BIN_ID);
httpClient.addHeader("X-Timestamp", timestamp);
httpClient.addHeader("X-Signature", signature);
httpClient.POST("/v1/bin/upload", jsonBody);
```

**Lado Backend (Python/FastAPI):**

```python
import hmac
import hashlib
from datetime import datetime, timedelta

def verify_esp32_signature(
    bin_id: str,
    timestamp: str,
    signature: str,
    body: bytes,
    db: Session
) -> bool:
    # 1. Validar timestamp (evita ataques de replay)
    request_time = datetime.fromtimestamp(int(timestamp))
    now = datetime.utcnow()
    if abs((now - request_time).total_seconds()) > 300:  # janela de 5 min
        return False

    # 2. Buscar a API key do hardware no banco
    bin = db.query(SmartBin).filter(SmartBin.bin_code == bin_id).first()
    if not bin or bin.status != BinStatus.ACTIVE:
        return False

    # 3. Calcular assinatura esperada
    message = f"{bin_id}{timestamp}{body.decode()}"
    expected_signature = hmac.new(
        bin.hardware_api_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    # 4. Comparação segura contra timing attacks
    return hmac.compare_digest(signature, expected_signature)
```

### Principais Recursos de Segurança

1. **HMAC-SHA256** - Autenticação criptográfica da mensagem
2. **Validação de timestamp** - Janela de 5 minutos evita ataques de replay
3. **Chaves de API por lixeira** - Rotação de chave sem afetar outras lixeiras
4. **Comparação segura contra timing** - Previne ataques baseados em tempo
5. **Log de auditoria** - Todas as requisições são registradas com assinaturas

---

## 3. Estrutura de Diretórios do Backend

```
back-end-tcc/
├── main.py                      # Ponto de entrada da aplicação FastAPI
├── config.py                    # Variáveis de ambiente e configurações
├── models.py                    # Modelos SQLAlchemy (já criado)
├── database.py                  # Conexão com o banco e gerenciamento de sessão
├── requirements.txt             # Dependências Python
├── alembic.ini                  # Configuração de migração do banco
│
├── api/
│   ├── __init__.py
│   ├── dependencies.py          # Auth, rate limiting, sessão do DB
│   │
│   └── v1/
│       ├── __init__.py
│       ├── router.py            # Agregador principal do router v1
│       │
│       ├── endpoints/
│       │   ├── __init__.py
│       │   ├── auth.py          # Login, cadastro e JWT do usuário
│       │   ├── users.py         # Perfil do usuário, pontos, histórico
│       │   ├── bins.py          # Gerenciamento de lixeiras (admin)
│       │   ├── upload.py        # /v1/bin/upload (endpoint ESP32)
│       │   ├── sessions.py      # Gerenciamento de sessões ativas
│       │   ├── materials.py     # CRUD do catálogo de materiais
│       │   ├── discards.py      # Histórico de descartes e analytics
│       │   └── rewards.py       # Pontos, ranking e resgates
│       │
│       └── schemas/
│           ├── __init__.py
│           ├── auth.py          # Modelos Pydantic para auth
│           ├── user.py          # Schemas de request/response do usuário
│           ├── bin.py           # Schemas de SmartBin
│           ├── session.py       # Schemas de sessão
│           ├── discard.py       # Schemas de validação de descarte
│           └── common.py        # Schemas compartilhados (paginação, etc.)
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py          # JWT, hashing de senha
│   ├── session_service.py       # Criação, validação e expiração de sessão
│   ├── validation_service.py    # Lógica da validação tripla
│   ├── ai_service.py            # Inferência do modelo de IA (classificação visual)
│   ├── reward_service.py        # Cálculo e distribuição de pontos
│   ├── storage_service.py       # Armazenamento local/S3 de imagens
│   └── security_service.py      # Verificação de assinatura HMAC
│
├── core/
│   ├── __init__.py
│   ├── security.py              # Utilitários de segurança (HMAC, rate limiting)
│   ├── exceptions.py            # Classes de exceção personalizadas
│   └── logging.py               # Configuração de logging estruturado
│
├── ml/
│   ├── __init__.py
│   ├── model.py                 # Carregamento e inferência do modelo de IA
│   ├── preprocessing.py         # Pré-processamento de imagem para visão computacional
│   └── models/
│       └── recyclable_classifier.h5  # Modelo treinado TensorFlow/PyTorch
│
├── migrations/                  # Migrações do banco com Alembic
│   ├── env.py
│   └── versions/
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Fixtures do Pytest
│   ├── test_auth.py
│   ├── test_sessions.py
│   ├── test_validation.py       # Testes da validação tripla
│   └── test_security.py         # Testes de assinatura HMAC
│
├── scripts/
│   ├── seed_materials.py        # Popular a tabela de materiais
│   ├── cleanup_sessions.py      # Job agendado para expirar sessões antigas
│   └── generate_bin_keys.py     # Gerar chaves de API do hardware
│
└── docs/
    ├── API.md                   # Documentação da API
    ├── DEPLOYMENT.md            # Guia de deploy em produção
    └── ESP32_INTEGRATION.md     # Guia de integração com hardware
```

---

## 4. Lógica de Validação Tripla para `/v1/bin/upload`

### Objetivo do Endpoint

Evitar fraude na injeção de pontos exigindo **três validações independentes** antes de liberar a pontuação.

### Fluxo de Validação

```
┌─────────────────────────────────────────────────────────────────┐
│                  /v1/bin/upload Endpoint                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
     ┌──────────────────────────────────────────────────┐
     │  Etapa 1: Autenticação do Hardware (ESP32)       │
     │  - Verificar assinatura HMAC                     │
     │  - Checar timestamp (prevenção de replay)        │
     │  - Validar se a lixeira está ATIVA                │
     └──────────────────┬───────────────────────────────┘
                        │ PASSOU
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Etapa 2: Validação de Sessão (Contexto do Usuário)
     │  - Verificar se existe sessão ativa para esta lixeira
     │  - Confirmar que a sessão não expirou (<3 minutos)
     │  - Garantir session.status == ACTIVE               │
     │  - Relacionar com o user_id da sessão             │
     └──────────────────┬───────────────────────────────┘
                        │ PASSOU
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Etapa 3: Validação de Peso (Load Cell)           │
     │  - Validar weight > material.min_weight_grams     │
     │  - Checar se o peso é plausível (< 10kg por item) │
     │  - Comparar com a capacidade máxima da lixeira     │
     │  - Sinalizar se o peso for anômalo                │
     └──────────────────┬───────────────────────────────┘
                        │ PASSOU
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Etapa 4: Validação por IA (ESP32-CAM)            │
     │  - Processar a imagem no modelo de classificação  │
     │  - Verificar confidence >= material.threshold     │
     │  - Correlacionar classe detectada com o material  │
     │  - Armazenar imagem para trilha de auditoria      │
     └──────────────────┬───────────────────────────────┘
                        │ PASSOU
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Etapa 5: Detecção de Fraude (Anti-Gaming)        │
     │  - Checar frequência recente de descartes         │
     │  - Detectar imagens idênticas (comparação de hash)
     │  - Sinalizar usuários com acurácia suspeitamente alta
     │  - Rate limit: máximo de 10 descartes por sessão  │
     └──────────────────┬───────────────────────────────┘
                        │ PASSOU
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Etapa 6: Atribuir Pontos e Atualizar Sessão      │
     │  - Calcular points = weight_kg * points_per_kg    │
     │  - Criar registro de Discard (validated=True)     │
     │  - Criar transação de Reward                      │
     │  - Atualizar User.total_points de forma atômica   │
     │  - Marcar checkpoints de validação da sessão      │
     └──────────────────────────────────────────────────┘
```

### Mecanismos Anti-Fraude

1. **Rate Limiting**
   - Máximo de 10 descartes por sessão
   - Máximo de 100 descartes por usuário por dia
   - Backoff exponencial para violações repetidas

2. **Deduplicação de Imagem**
   - Calcular hash perceptual (pHash) de cada imagem
   - Rejeitar se uma imagem idêntica for submetida dentro de 24 horas
   - Sinalizar o usuário se mais de 50% das imagens forem duplicadas

3. **Detecção de Anomalia de Peso**
   - Rejeitar itens com peso acima de 10kg (incompatível para itens individuais)
   - Sinalizar se o usuário pesar itens repetidamente em valores exatos de limite
   - Detecção de outliers baseada em ML para padrões de peso

4. **Enforço de Timeout da Sessão**
   - Limite rígido de 3 minutos a partir do início da sessão
   - Worker em background expira sessões a cada 30 segundos
   - Uploads são rejeitados se a sessão expirar durante a requisição

5. **Limiar de Confiança da IA**
   - Rejeitar se a confiança for menor que `material.confidence_threshold`
   - Sinalizar para revisão manual se a confiança estiver entre 0.6 e 0.75
   - Aceitar automaticamente se a confiança for maior que 0.9

### Respostas de Erro da Validação

```python
# Exemplos de respostas de erro
{
    "error": "session_expired",
    "message": "Sua sessão expirou. Escaneie o QR code novamente.",
    "code": 403
}

{
    "error": "weight_validation_failed",
    "message": "O peso (0.5g) está abaixo do limite mínimo (10g)",
    "code": 422
}

{
    "error": "ai_classification_failed",
    "message": "A confiança da classificação do material está muito baixa (0.45 < 0.70)",
    "details": {
        "detected": "plastic_bottle",
        "confidence": 0.45,
        "threshold": 0.70
    },
    "code": 422
}

{
    "error": "rate_limit_exceeded",
    "message": "Máximo de 10 descartes por sessão. Inicie uma nova sessão.",
    "code": 429
}
```

---

## 5. Observações Críticas de Implementação

### Transações de Banco de Dados

- Usar isolamento `SERIALIZABLE` para atualizações de pontos e evitar condições de corrida
- Atualizações atômicas de `User.total_points` com locking otimista

### Limpeza de Sessões

- Tarefa Celery em background executa a cada 30 segundos
- Marca sessões expiradas como `EXPIRED`
- Evita o crescimento excessivo da tabela de sessões

### Armazenamento de Imagens

- Armazenar imagens no S3 ou no sistema de arquivos local, não no banco
- Manter `image_path` no banco para referência
- Implementar política de ciclo de vida (excluir após 90 dias)

### Deploy do Modelo de IA

- Usar TensorFlow Lite ou ONNX para o ESP32-CAM (inferência na borda)
- Usar inferência no backend como fallback se o ESP32 não tiver recursos
- Versionar modelos para permitir testes A/B

### Monitoramento e Alertas

- Rastrear taxas de falha de validação por lixeira
- Emitir alerta se mais de 20% das requisições falharem na validação de assinatura
- Monitorar taxas de expiração de sessão (devem ser menores que 5%)

---

## 6. Próximos Passos

1. **Desenvolvimento da API Backend**
   - Implementar o endpoint `/v1/bin/upload`
   - Construir endpoints de gerenciamento de sessão
   - Criar autenticação de usuário (JWT)

2. **Firmware do ESP32**
   - Implementar geração de assinatura HMAC
   - Integrar a câmera e o sensor de peso
   - Adicionar lógica de retry para uploads com falha

3. **Treinamento do Modelo de IA**
   - Coletar dataset rotulado de materiais recicláveis
   - Treinar modelo EfficientNet ou MobileNet
   - Converter para TensorFlow Lite para deploy na borda

4. **App Mobile**
   - Scanner de QR code para iniciar sessões
   - Exibição de pontos em tempo real
   - Histórico de descartes e ranking

5. **Painel Administrativo**
   - Monitorar saúde e status das lixeiras
   - Revisar descartes sinalizados
   - Analytics sobre padrões de reciclagem

---

**Versão da Arquitetura:** 1.0
**Última Atualização:** 2026-03-26
**Autor:** CTO/Desenvolvedor Sênior
