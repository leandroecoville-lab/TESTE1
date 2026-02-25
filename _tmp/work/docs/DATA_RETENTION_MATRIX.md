# DATA_RETENTION_MATRIX — Matriz de Retenção por Módulo (governança)

Regra: retenção por módulo é definida por risco, finalidade e governança.

## MeetCore (Sales / Calls)
- Pode armazenar gravações quando necessário (ex.: auditoria, qualidade, treinamento), sob:
  - consentimento, opt-in, e política de retenção configurável por tenant
  - criptografia at-rest + TLS em trânsito
  - trilha de auditoria append-only para acessos
- Preferir armazenar derivados governados (transcrição, eventos, relatórios) quando possível.

## Culture & People (Pipeline Efêmero)
- Pipeline efêmero: nenhum dado bruto persistido
- Persistir somente derivados governados (vetores, relatórios, evidências mínimas) com RBAC/TBAC e auditoria.

## Regras gerais
- Minimização: armazenar o mínimo necessário para finalidade declarada.
- Exclusão: suportar retenção e exclusão por tenant.
