# Controle Rapido

Atualizado em: **2026-02-15**

## Ja Pronto
- Dashboard com caixas de vencimentos acima do grafico mensal
- Confirmacao de pagamento com modal customizado
- Status no modal de pagamento corrigido (mostra atraso corretamente)
- Forma de pagamento no modal de confirmacao (PIX, Dinheiro, Transferencia)
- Cobranca via WhatsApp Web
- Email diario de vencimentos (com telefone/WhatsApp dos clientes)
- Dados de teste historicos para grafico (8 meses, tag `[TESTE_GRAFICO]`)
- Grafico mensal com 3 linhas (Atraso vermelho, Recebido verde, Em aberto laranja)

## Mudancas Recentes
- Removido seletor "Linhas fixas" do cabecalho do grafico
- Filtro de periodo ajustado para "3 meses", "6 meses" e "12 meses"
- Removido outline visual no seletor de periodo
- Removido outline visual de foco (inputs/botoes/links) nas telas Painel financeiro e Clientes
- Seed de dados demo no banco para testar Painel financeiro e Clientes (`npm run db:seed:demo`)
- Titulo do grafico alterado para "Visao mensal da carteira"
- Layout ajustado para celular nas telas principais (header/sidebar/espacamentos)
- Toasts de aviso adaptados para mobile (sem cortar mensagem)
- Menu do usuario adicionado com: Meu perfil, Seguranca, Ajuda e Sair
- Cobranca WhatsApp no dashboard ajustada para link universal (abre no celular sem forcar WhatsApp Web)
- Telefone de teste aplicado nos clientes com parcelas atrasadas (WhatsApp)
- Correcao de acentuacao (UTF-8) nos templates EJS para evitar textos quebrados no celular
- Menu do usuario: itens agora abrem a pagina Conta (perfil/seguranca/ajuda) e Sair faz logout
- Pagina Conta criada com salvar perfil e trocar senha (backend + UI)
- Preferencias removidas do menu/pagina Conta; Ajuda agora mostra email e telefone de contato
- Logo: removido SVG e mantido nome (Cred branco + Facil dourado) no login e header
- Meu perfil: removido campo "Perfil (ADMIN)" para simplificar
- Meu perfil: removida opcao de foto do perfil (avatar)
