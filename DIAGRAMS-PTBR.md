# 🔄 Diagramas de Fluxo do Sistema

## 1. Fluxo Completo da Jornada do Usuário

```
┌──────────────┐
│ App Mobile   │
│ (Usuário)    │
└──────┬───────┘
       │
       │ 1. Escanear o QR Code na Smart Bin
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ POST /v1/sessions/start                                      │
│ Headers: Authorization: Bearer <JWT_TOKEN>                   │
│ Body: { "bin_code": "BIN_001" }                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │ Backend API     │
         │                 │
         │ 1. Validar JWT  │
         │ 2. Verificar   │
         │    se a lixeira│
         │    está ativa   │
         │ 3. Criar       │
         │    ActiveSession│
         │    (expira em  │
         │     3 minutos)  │
         └────────┬────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │ Resposta:                   │
    │ {                           │
    │   "session_id": "abc123",   │
    │   "session_token": "...",   │
    │   "expires_at": "13:03:00"  │
    │ }                           │
    └──────────┬──────────────────┘
               │
               │ 2. O usuário deposita o item reciclável
               │    (ação física)
               │
               ▼
    ┌──────────────────────────┐
    │ ESP32-CAM Smart Bin      │
    │                          │
    │ Sensores ativados:       │
    │ ⚖️  Peso: 245g           │
    │ 📸 Imagem: bottle.jpg    │
    └──────────┬───────────────┘
               │
               │ 3. ESP32 envia os dados para o backend
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│ POST /v1/bin/upload                                          │
│                                                              │
│ Headers:                                                     │
│   X-Bin-ID: BIN_001                                          │
│   X-Timestamp: 1234567890                                    │
│   X-Signature: hmac_sha256(...)                              │
│                                                              │
│ Body:                                                        │
│   {                                                          │
│     "session_token": "abc123",                               │
│     "weight_grams": 245,                                     │
│     "image": "<imagem_em_base64>"                          │
│   }                                                          │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ PIPELINE DE VALIDAÇÃO TRIPLA                                 │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDAÇÃO 1: Assinatura HMAC                            │ │
│ │ ✓ Verificar assinatura do ESP32                         │ │
│ │ ✓ Checar timestamp (±5 min)                             │ │
│ │ ✓ Confirmar que a lixeira está ativa                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASSA                            │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDAÇÃO 2: Sessão Ativa                                │ │
│ │ ✓ Sessão existe e status=ACTIVE                         │ │
│ │ ✓ Não expirou (< 3 minutos)                             │ │
│ │ ✓ Sessão corresponde ao bin_id                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASSA                            │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDAÇÃO 3: Peso                                        │ │
│ │ ✓ Peso >= 10g (limiar mínimo)                           │ │
│ │ ✓ Peso <= 10kg (máximo realista)                        │ │
│ │ ✓ Nenhuma anomalia de peso detectada                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASSA                            │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDAÇÃO 4: Classificação por IA                        │ │
│ │ 1. Executar a imagem no modelo TensorFlow               │ │
│ │ 2. Detectar: "plastic_pet" (confiança: 0.92)             │ │
│ │ 3. Verificar confiança >= limiar 0.70                   │ │
│ │ 4. Fazer correspondência com a tabela Materials         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASSA                            │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDAÇÃO 5: Detecção de Fraude                          │ │
│ │ ✓ Não é imagem duplicada (hash perceptual)              │ │
│ │ ✓ Usuário < 10 descartes nesta sessão                   │ │
│ │ ✓ Usuário < 100 descartes hoje                          │ │
│ │ ✓ Nenhum padrão suspeito detectado                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ TODAS PASSAM                    │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ATRIBUIR PONTOS                                          │ │
│ │                                                          │ │
│ │ Cálculo:                                                │ │
│ │   weight_kg = 245g / 1000 = 0.245 kg                    │ │
│ │   points_per_kg = 120 (PET Plastic)                     │ │
│ │   points = 0.245 * 120 = 29 pontos                      │ │
│ │                                                          │ │
│ │ Transações de Banco:                                     │ │
│ │ 1. INSERT INTO discards (validated=true, points=29)     │ │
│ │ 2. INSERT INTO rewards (points=29, type='discard')      │ │
│ │ 3. UPDATE users SET total_points += 29                  │ │
│ │ 4. UPDATE active_sessions (checkpoints de validação)    │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ Resposta ao ESP32:  │
         │ {                   │
         │   "success": true,  │
         │   "points": 29,     │
         │   "material": "PET" │
         │ }                   │
         └─────────┬───────────┘
                   │
                   │ 4. ESP32 acende LED de sucesso
                   │
                   ▼
         ┌─────────────────────┐
         │ Notificação Push:   │
         │ "🎉 +29 pontos!"    │
         │ "PET Plastic"       │
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ Atualizar App Mobile │
         │ Mostrar novo total:  │
         │ "1.234 pontos"      │
         └─────────────────────┘
```

---

## 2. Handshake de Segurança do ESP32 (Detalhado)

```
┌─────────────┐                                    ┌─────────────┐
│   ESP32     │                                    │   Backend   │
│   CAM       │                                    │   API       │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. Evento de captura (mudança de peso detectada) │
       │                                                  │
       ├──────────────────────────────────────────────────────────┐
       │ Preparar requisição:                                      │
       │                                                          │
       │   bin_id = "BIN_001"                                     │
       │   timestamp = 1711234567 (Unix epoch)                    │
       │   payload = {"session_token": "abc", "weight": 245}  │
       │                                                          │
       │   // Geração da assinatura                               │
       │   message = bin_id + timestamp + JSON.stringify(payload) │
       │   signature = HMAC-SHA256(HARDWARE_API_KEY, message)     │
       └──────────────────────────────────────────────────────────┘
       │
       │ POST /v1/bin/upload
       │ X-Bin-ID: BIN_001
       │ X-Timestamp: 1711234567
       │ X-Signature: 3f89a2b... (64 chars hex)
       │ Body: {"session_token": "abc", "weight": 245, ...}
       ├────────────────────────────────────────────────>
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 1. Checagem de       │
       │                                    │    Timestamp         │
       │                                    │    now = 1711234570  │
       │                                    │    diff = 3 seconds  │
       │                                    │    ✓ Dentro de ±5min │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 2. Consulta ao Banco  │
       │                                    │    SELECT api_key     │
       │                                    │    FROM smart_bins    │
       │                                    │    WHERE code=BIN_001 │
       │                                    │    AND status=ACTIVE  │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 3. Calcular Assinatura│
       │                                    │    Esperada           │
       │                                    │    msg = BIN_001 +    │
       │                                    │          1711234567 + │
       │                                    │          payload      │
       │                                    │    expected_sig =     │
       │                                    │    HMAC(api_key, msg) │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 4. Comparação Segura  │
       │                                    │    hmac.compare_      │
       │                                    │    digest(            │
       │                                    │      received_sig,    │
       │                                    │      expected_sig     │
       │                                    │    )                  │
       │                                    │    ✓ Confere!         │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 5. Registrar Evento   │
       │                                    │    de Auditoria       │
       │                                    │    INSERT audit_logs  │
       │                                    │    (event=bin_upload, │
       │                                    │     signature=valid)  │
       │                                    └─────────────┬────────┘
       │                                                  │
       │ <────────────────────────────────────────────────┤
       │ 200 OK - Prosseguir com validação               │
       │                                                  │
       │                                                  │
       │ ❌ ALTERNATIVA: Assinatura Inválida              │
       │ <────────────────────────────────────────────────┤
       │ 401 Unauthorized                                 │
       │ {"error": "invalid_signature"}                  │
       │                                                  │
       ├──────────────────────────────────────────────────────────┐
       │ Tratamento de erro no ESP32:                              │
       │   - Registrar falha                                       │
       │   - Tentar novamente 3 vezes com backoff exponencial      │
       │   - Se continuar falhando, salvar localmente e sincronizar│
       │   - Exibir LED de erro para o usuário                     │
       └──────────────────────────────────────────────────────────┘
```

---

## 3. Ciclo de Vida da Sessão e Gerenciamento de Timeout

```
┌─────────────────────────────────────────────────────────────┐
│                CICLO DE VIDA DA SESSÃO                      │
└─────────────────────────────────────────────────────────────┘

HORÁRIO: 13:00:00 - Usuário escaneia o QR code
        │
        ▼
┌───────────────────────────────┐
│ ActiveSession Criada          │
│ session_id: 123               │
│ user_id: 456                  │
│ bin_id: 1                     │
│ status: ACTIVE                │
│ started_at: 13:00:00          │
│ expires_at: 13:03:00          │
└───────────────────────────────┘
        │
        │
HORÁRIO: 13:00:30 - Primeiro descarte (+30s)
        │
        ▼
┌───────────────────────────────┐
│ Discard #1 Criado             │
│ weight_validated: ✓           │
│ vision_validated: ✓           │
│ session_validated: ✓          │
│ points_awarded: 29            │
└───────────────────────────────┘
        │
        │
HORÁRIO: 13:01:15 - Segundo descarte (+1m 15s)
        │
        ▼
┌───────────────────────────────┐
│ Discard #2 Criado             │
│ Sessão ainda válida (< 3min)  │
│ points_awarded: 15            │
└───────────────────────────────┘
        │
        │
HORÁRIO: 13:02:45 - Terceiro descarte (+2m 45s)
        │
        ▼
┌───────────────────────────────┐
│ Discard #3 Criado             │
│ ⚠️  Aviso: 15s restantes      │
│ points_awarded: 22            │
└───────────────────────────────┘
        │
        │
HORÁRIO: 13:03:05 - Quarto descarte tentado (+3m 5s)
        │
        ▼
┌───────────────────────────────┐
│ ❌ SESSÃO EXPIRADA            │
│ Resposta de rejeição:         │
│ {                             │
│   "error": "session_expired", │
│   "expired_at": "13:03:00",   │
│   "current_time": "13:03:05"  │
│ }                             │
└───────────────────────────────┘
        │
        │ Tarefa Celery em background (executa a cada 30s)
        │
        ▼
┌───────────────────────────────┐
│ Worker de Limpeza de Sessões  │
│                               │
│ UPDATE active_sessions        │
│ SET status = 'EXPIRED'        │
│ WHERE expires_at < NOW()      │
│ AND status = 'ACTIVE'         │
│                               │
│ Linhas afetadas: 1            │
└───────────────────────────────┘
```

---

## 4. Relacionamentos das Entidades do Banco

```
┌─────────────┐
│   Users     │
│─────────────│
│ id (PK)     │───┐
│ email       │   │
│ username    │   │
│ total_points│   │
│ created_at  │   │
└─────────────┘   │
                  │
                  │ 1:N
                  │
       ┌──────────┴──────────────────────────────┐
       │                                         │
       ▼                                         ▼
┌────────────────┐                      ┌─────────────┐
│ ActiveSessions │                      │  Discards   │
│────────────────│                      │─────────────│
│ id (PK)        │──────1:N────────────>│ id (PK)     │
│ user_id (FK)   │                      │ session_id  │
│ bin_id (FK)    │◄──┐                  │ user_id (FK)│
│ session_token  │   │                  │ bin_id (FK) │
│ started_at     │   │                  │ material_id │
│ expires_at     │   │                  │ weight_grams│
│ status         │   │                  │ ai_class... │
└────────────────┘   │                  │ points_...  │
                     │                  │ validated   │
                     │                  └─────────────┘
                     │                         │
                     │ N:1                     │ N:1
                     │                         │
              ┌──────┴──────┐           ┌─────┴────────┐
              │             │           │              │
              ▼             │           ▼              │
      ┌─────────────┐       │   ┌─────────────┐       │
      │  SmartBins  │       │   │  Materials  │       │
      │─────────────│       │   │─────────────│       │
      │ id (PK)     │       │   │ id (PK)     │       │
      │ bin_code    │       │   │ name        │       │
      │ api_key     │       │   │ category    │       │
      │ location    │       │   │ points_/kg  │       │
      │ status      │       │   │ ai_class... │       │
      └─────────────┘       │   └─────────────┘       │
              │             │                         │
              │ 1:N         │                         │
              │             │                         │
              └─────────────┴─────────────────────────┤
                                                      │
                                                      │ N:1
                                                      │
                                              ┌───────┴──────┐
                                              │   Rewards    │
                                              │──────────────│
                                              │ id (PK)      │
                                              │ user_id (FK) │
                                              │ discard_id   │
                                              │ points       │
                                              │ type         │
                                              │ created_at   │
                                              └──────────────┘
```

---

## 5. Pipeline de Detecção Anti-Fraude

```
┌────────────────────────────────────────────────────────────┐
│          CHECKPOINTS DE DETECÇÃO DE FRAUDE                │
└────────────────────────────────────────────────────────────┘

Toda requisição /v1/bin/upload passa por:

┌─────────────────────────────────────────────────────────┐
│ Checkpoint 1: Limite de Requisições                    │
│                                                         │
│ SELECT COUNT(*) FROM discards                           │
│ WHERE user_id = ? AND session_id = ?                    │
│                                                         │
│ IF count >= 10:                                         │
│   → REJEITAR (429: rate_limit_exceeded)                 │
│                                                         │
│ SELECT COUNT(*) FROM discards                           │
│ WHERE user_id = ? AND DATE(created_at) = TODAY()        │
│                                                         │
│ IF count >= 100:                                        │
│   → REJEITAR (429: daily_limit_exceeded)                │
└─────────────────────────────────────────────────────────┘
                         │ PASSA
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 2: Detecção de Imagem Duplicada             │
│                                                         │
│ 1. Calcular hash perceptual (pHash) da imagem enviada  │
│    phash = imagehash.phash(image)                       │
│                                                         │
│ 2. Consultar descartes recentes com hashes semelhantes │
│    SELECT * FROM discards                               │
│    WHERE user_id = ?                                    │
│    AND created_at > NOW() - INTERVAL 24 HOUR            │
│                                                         │
│ 3. Comparar distância de Hamming                        │
│    FOR EACH previous_discard:                           │
│      distance = hamming_distance(phash, prev_phash)     │
│      IF distance < 5 (muito similar):                   │
│        → MARCAR como suspeito                           │
│        → Ainda permitir, mas registrar para revisão     │
└─────────────────────────────────────────────────────────┘
                         │ PASSA
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 3: Detecção de Anomalia de Peso              │
│                                                         │
│ 1. Obter o histórico de peso do usuário                │
│    SELECT AVG(weight_grams) as avg,                     │
│           STDDEV(weight_grams) as stddev                │
│    FROM discards WHERE user_id = ?                      │
│                                                         │
│ 2. Calcular Z-score                                     │
│    z_score = (current_weight - avg) / stddev            │
│                                                         │
│ 3. Verificar anomalias                                  │
│    IF ABS(z_score) > 2.5:                               │
│      → MARCAR como anômalo                              │
│      → Exigir revisão manual se confidence < 0.9        │
│                                                         │
│ 4. Verificar "gaming the system"                       │
│    IF weight consistently at minimum threshold:         │
│      → MARCAR usuário para investigação                 │
└─────────────────────────────────────────────────────────┘
                         │ PASSA
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 4: Validação da Confiança da IA              │
│                                                         │
│ IF confidence < 0.60:                                   │
│   → REJEITAR (classificação muito incerta)              │
│                                                         │
│ IF 0.60 <= confidence < 0.75:                           │
│   → MARCAR para revisão manual                          │
│   → Ainda conceder pontos, mas marcar para auditoria    │
│                                                         │
│ IF confidence >= 0.75:                                  │
│   → AUTOAPROVAR                                         │
└─────────────────────────────────────────────────────────┘
                         │ PASSA
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 5: Análise de Padrão Comportamental          │
│                                                         │
│ Calcular métricas do usuário:                           │
│   - Tempo médio entre descartes                         │
│   - Variância nos tipos de materiais                    │
│   - Consistência nas medições de peso                   │
│   - Taxa de sucesso (validados / tentativas totais)     │
│                                                         │
│ IF success_rate > 95% AND total_discards > 50:          │
│   → MARCAR como "perfeito demais" (possível fraude)    │
│                                                         │
│ IF avg_time_between_discards < 10 seconds:              │
│   → MARCAR como "rapid fire" (possível automação)      │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
                  ✅ TODAS AS VERIFICAÇÕES PASSARAM
                     Atribuir Pontos
```

---

**Criado para o Projeto Eco Mais Smart Recycling**
**Última Atualização: 2026-03-26**
