# Backend Eco Mais

API FastAPI do projeto Eco Mais, com autenticação JWT, sessões de descarte,
validação de materiais, pontuação, recompensas e integração com as lixeiras.

## Estrutura

```text
back-end-tcc/
|-- api/               Rotas e schemas Pydantic
|-- services/          Regras de negócio e tarefas
|-- tests/             Testes automatizados
|-- main.py            Entrada da aplicação FastAPI
|-- models.py          Modelos SQLAlchemy
|-- database.py        Conexão e sessões do banco
|-- config.py          Configurações de ambiente
|-- setup.py           Inicialização de dados de desenvolvimento
`-- requirements.txt   Dependências Python
```

## Execução

Execute os comandos a partir desta pasta:

```powershell
cd back-end-tcc
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python setup.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Testes:

```powershell
pytest -q
```

Os caminhos de uploads, logs e modelos de IA são relativos a esta pasta. O
modelo esperado pela configuração é `ml/models/recyclable_classifier.pt`.
