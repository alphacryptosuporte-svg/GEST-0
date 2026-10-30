# Gestão de Risco & Diário de Trading

Aplicação completa de gestão de risco operacional e diário de trading, desenvolvida em React + TypeScript + Vite.

## Recursos
- **Gestão de Risco**: Teto de perda acumulada por semana (Sistema A) e por mês (Sistema B), cálculo dinâmico baseado no capital da banca, visualização com anéis de progresso SVG e alertas de bloqueio.
- **Diário de Trades**: Cadastro e edição de trades em carteiras USD e BRL (ações), suporte a múltiplas entradas e saídas parciais, cálculo automático de preço médio, stop, payoff, R múltiplos, risco máximo permitido por setup e time frame, exportação para planilha Excel (.xlsx), filtros e busca avançada.
- **Carteira e Renda Fixa**: Acompanhamento patrimonial, evolução de capital mês a mês com curva gráfica, controle de aportes/saques, análise de desempenho por recorte (setup, ativo, corretora, dia da semana, hora) e relatório diagnóstico mensal.
- **Protocolo Diário**: Rotina matinal estruturada em 9 etapas com bloqueio profilático ("gatekeeper") até a conclusão, correlação histórica entre cumprimento do protocolo e rentabilidade, e Frase do Dia.
- **Setups e Regras**: Especificações detalhadas dos setups operacionais (4 EMAs, Setup da Vitória, Lamborghini, DIVAP, Perfeição, etc.) e tetos de risco customizáveis por time frame.
- **Backup e Restauração**: Exportação e importação de backups completos em formato JSON.
