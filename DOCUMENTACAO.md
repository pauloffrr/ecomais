📚 Documentação Técnica Completa: Eco Mais - Smart Recycling Bin System

1. Visão Geral do Projeto
   O Eco Mais é um sistema inteligente de lixeiras de reciclagem (Smart Bins) voltado para uma startup de Green-Tech. O objetivo principal é incentivar o descarte correto de resíduos por meio de gamificação (recompensas), garantindo a integridade do sistema contra fraudes através de uma rigorosa arquitetura de Validação Tripla (Sessão do Usuário + Peso + Visão Computacional).
   O ecossistema é composto por:
   Hardware: Lixeira equipada com ESP32-CAM (para captura de imagens e comunicação) e sensor de Célula de Carga (para medição de peso).
   Backend: API RESTful desenvolvida em Python (FastAPI).
   Inteligência Artificial: Modelo de Visão Computacional (YOLOv8) para classificar o material reciclado.
   Banco de Dados: MariaDB/MySQL para persistência de dados.

2. Arquitetura do Sistema e Stack Tecnológica
   Linguagem & Framework: Python 3.11+, FastAPI.
   Banco de Dados: MariaDB 10.6+ / MySQL 8.0+.
   ORM: SQLAlchemy 2.0 (com uso de filas de conexão QueuePool e transações atômicas).
   Configuração de Ambiente: pydantic-settings (.env).
   Processamento Assíncrono (MVP): FastAPI BackgroundTasks (com previsão de migração para Celery + Redis em produção).
   Machine Learning: Ultralytics YOLOv8 + OpenCV.
   Segurança: Autenticação de usuários via JWT, Autenticação de Hardware via assinaturas criptográficas (HMAC-SHA256).

3. Fluxo Principal: Validação Tripla (Triple Validation)
   Para evitar injeção de pontos (fraudes), o sistema requer três validações independentes antes de creditar os pontos ao usuário. Quando uma requisição de upload é feita pela lixeira, o seguinte fluxo ocorre:
   Validação de Sessão (Contexto do Usuário):
   O usuário inicia uma sessão (ex: escaneando um QR Code).
   O sistema gera um session_token com um tempo de expiração restrito a 3 minutos.
   O backend verifica se a sessão ainda está ativa para aquela lixeira e se não expirou.
   Validação de Peso (Célula de Carga):
   O peso enviado pela ESP32 é avaliado em comparação às configurações do sistema (limites mínimo e máximo realistas, ex: >10g e <10kg).
   Mecanismos de anomalia verificam inconsistências estatísticas.
   Validação de Visão com IA (ESP32-CAM):
   A imagem enviada é processada em background por um modelo YOLOv8.
   A IA identifica a classe do material (ex: plastic_pet) e o grau de confiança da predição.
   Se a confiança superar um limite estipulado (confidence_threshold), a validação passa.
   Se os limites forem limítrofes, a submissão é marcada para revisão manual (flagged_as_suspicious).
   Se e somente se as 3 validações passarem, os pontos são calculados (peso_kg × pontos_por_kg) e creditados atomicamente ao usuário.

4. Segurança e Integração de Hardware (ESP32 ↔ Backend)
   A comunicação entre a lixeira inteligente e a API é protegida para evitar que agentes maliciosos enviem requisições falsas e gerem pontos ilícitos.
   Handshake Criptográfico (HMAC-SHA256):
   Cada Smart Bin possui uma chave de API de hardware (hardware_api_key).
   A ESP32 cria uma assinatura concatenando: ID_DA_LIXEIRA + TIMESTAMP_ATUAL + BODY_DA_REQUISICAO.
   A ESP32 aplica o algoritmo de hash HMAC-SHA256 nesta string usando sua chave de API e a envia no header X-Signature.
   O Backend recalcula o hash com a chave que está salva no banco. A requisição só é autorizada se as assinaturas coincidirem, utilizando a comparação à prova de ataques de tempo (hmac.compare_digest).
   Prevenção a Replay Attacks: O Backend rejeita qualquer requisição cujo X-Timestamp possua uma diferença maior que 5 minutos (SIGNATURE_TIMESTAMP_TOLERANCE_SECONDS) em relação ao horário do servidor.
   Proteções Adicionais Antifraude:
   Rate Limits: Máximo de descartes por sessão (ex: 10) e por dia (ex: 100).
   Deduplicação de Imagens: Cálculo de hash perceptivo (pHash) para rejeitar imagens idênticas enviadas nas últimas 24h.

5. Estrutura do Banco de Dados (Schema)
   O banco de dados é estruturado usando SQLAlchemy e possui políticas avançadas de isolamento (READ COMMITTED) e timezone UTC rígido.
   Users: Mantém o perfil dos usuários e é a base da gamificação (total_points, total_discards). Atualizações de pontuação usam tratamento para travamento otimista (optimistic locking) visando mitigar condições de corrida.
   SmartBins: Cadastro das lixeiras físicas. Armazena latitude, longitude, limite de carga (max_weight_kg), status e as chaves de API.
   ActiveSessions: Elo central que une o Usuário, a Lixeira e a sessão ativa. Utiliza o campo expires_at (indexado) para limpeza rotineira.
   Materials: Catálogo de materiais recicláveis, definindo points_per_kg, os nomes das classes que o modelo de IA retorna (ai_class_name), e o limite mínimo de confiança da IA.
   Discards: Histórico de descarte. É a tabela onde as três etapas de validação são marcadas (session_validated, weight_validated, vision_validated). Serve também de trilha de auditoria antifraude.
   Rewards: Livro-razão (Ledger) das transações de pontos, registrando recebimentos ou resgates.
   AuditLog: Tabela de segurança forense para registrar todos os acessos das ESP32s, armazenando IP, tipo de evento e as assinaturas enviadas.

6. Serviços e Processamento em Segundo Plano (Background Tasks)
   Para garantir que a ESP32 não fique travada aguardando o processamento pesado do servidor, foi desenhada uma arquitetura orientada a tarefas assíncronas:
   O endpoint /v1/bin/upload executa validações simples (Autenticação, Sessão e Peso), salva a imagem em disco (síncrono, para persistência) e imediatamente retorna um código HTTP 200 OK.
   A partir daí, as seguintes tarefas rodam no recurso BackgroundTasks do FastAPI:
   Processamento da Imagem na IA (process_image_with_ai): Roda o modelo de Visão Computacional, verifica materiais e thresholds, efetiva (ou não) a pontuação e salva transações de recompensas.
   Limpeza de Sessões (cleanup_expired_sessions): Invalida ativamente as sessões cujo expires_at já passou, alterando o status para EXPIRED.
   Limpeza de Imagens Antigas (cleanup_old_images): Exclui localmente imagens com base numa política de retenção (ex: 90 dias) para poupar disco.

7. Principais Endpoints da API
   GET /health: Monitoramento e verificação do status da API e conexão ao banco.
   POST /v1/bin/upload: (Core) Ponto de contato principal da ESP32 para enviar peso e imagem. Executa a primeira parte da Validação Tripla. Requer os headers de segurança (X-Bin-ID, X-Timestamp, X-Signature).
   POST /v1/bin/heartbeat: Recebe atualizações de integridade e capacidade física (current_load_kg) periodicamente das lixeiras inteligentes.

8. Configurações Dinâmicas (Pydantic Settings)
   Toda a lógica de negócios e variáveis sensíveis são importadas do config.py. As definições cobrem áreas como:
   Regras de segurança de Senha e JWT.
   Rotinas de tolerância para o relógio da ESP32.
   Limites da operação (peso mínimo/máximo, limiares de detecção de fraudes).
   Mapeamento das classes do YOLO (MATERIAL_CLASSES como plastic_pet, glass_clear, etc).
   Alternância (Feature Flags) que habilitam/desabilitam integrações.
