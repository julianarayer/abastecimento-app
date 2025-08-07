# Aplicativo de Abastecimento

Este é um aplicativo web desenvolvido em React com integração ao Supabase e APIs externas (OCR + OpenAI), voltado para **otimizar o processo de abastecimento e controle de reposições de produtos** em pontos de venda de uma empresa do setor de bebidas.

## Funcionalidades principais

- **Login de promotores** com ID exclusivo
- **Seleção de cidade e loja**
- **Três etapas de validação** com:
  - Cadastro de lotes com leitura de fotos
  - Leitura automática via **OCR (Reconhecimento Óptico de Caracteres)** para extrair validade e lote de embalagens
  - Análise e validação inteligente dos dados via **API da OpenAI**
  - Observações manuais e possibilidade de pular etapas
  - Upload de foto final por seção
- **Checkout com resumo do abastecimento**
- Tela de confirmação visual de sucesso

## Objetivo do sistema

O app foi criado para **automatizar e padronizar o processo de coleta de dados em campo**, facilitando a atuação dos promotores e permitindo um **controle mais inteligente e em tempo real** das condições dos produtos no ponto de venda.  
Ao usar **OCR + OpenAI**, o app reduz erros manuais, acelera o preenchimento e garante maior precisão nos dados registrados.

## Segurança

Nenhuma informação sensível está exposta neste repositório. As credenciais do Supabase foram substituídas por placeholders:

```ts
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-CHAVE-ANONIMA-AQUI';
