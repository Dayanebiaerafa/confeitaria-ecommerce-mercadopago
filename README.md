# 🍰 Confeitaria Full Stack & Automação

Backend em Python (Flask) que conecta checkout, pagamento, planilha de produção, agenda e WhatsApp para a minha confeitaria artesanal, eliminando o lançamento manual dos pedidos.

**Site:** [confeitariadayaneteodoro.com.br](https://www.confeitariadayaneteodoro.com.br) 

**Stack:** Python · Flask · PostgreSQL (JSONB) · Mercado Pago SDK v2 · WhatsApp Cloud API · n8n · Docker · Gemini API · Google Apps Script · Render

---

## Demonstração
* [Checkout e fluxo do pedido](https://github.com/Dayanebiaerafa/confeitaria-ecommerce-mercadopago/raw/main/static/assets/Checkout-e-fluxo-do-pedido)
* [Assistente com Gemini em ação](https://github.com/Dayanebiaerafa/confeitaria-ecommerce-mercadopago/raw/main/static/assets/assistente/assistente.mp4)
* [Fluxo n8n de verificação de duplicidade](https://github.com/Dayanebiaerafa/confeitaria-ecommerce-mercadopago/blob/main/static/assets/assistente/n8nautomacaodeduplicidadadepedido.png)

---

## O problema
Os pedidos de bolos personalizados chegavam por canais diferentes e exigiam digitação manual em planilha, agenda e mensagens ao cliente. O sistema automatiza todo esse caminho após a aprovação do pagamento.

---

## Como funciona
1. O cliente monta o pedido no site (regras de peso mínimo, prazo e recheios validadas em JavaScript).
2. O pagamento é feito via Checkout Transparente do Mercado Pago (Pix ou cartão), com `device_id` para prevenção de fraude.
3. O Mercado Pago chama o endpoint `/webhook`; quando o status muda para `approved`, o backend dispara o pós-venda.
4. O pedido é gravado no PostgreSQL (campos principais em colunas; o payload completo em JSONB), registrado na planilha de produção e agendado no Google Calendar.
5. O cliente recebe a confirmação por WhatsApp (templates oficiais da Meta).

---

## Decisões de engenharia
* **JSONB para pedidos personalizados:** Massas, recheios e toppings mudam com frequência; guardar o payload completo evita migrações no banco a cada ajuste de cardápio.
* **Idempotência:** O backend verifica duplicidade antes de registrar o pedido, e um workflow no n8n (Docker) varre os registros e envia alerta quando encontra conflito.
* **Webhook assíncrono:** O fluxo de pós-venda parte do evento de pagamento aprovado, garantindo que o sistema só trabalhe com pedidos pagos.
* **Tratamento de dados:** CPF é mascarado nos logs, telefones são normalizados para o padrão E.164 e as chaves de API ficam protegidas em variáveis de ambiente no Render.
* **Agente de atendimento:** Assistente com Gemini API e RAG (via Google Apps Script) que responde com base nas políticas da loja (prazos, taxas de entrega, sabores e valores).
* **Deploy:** Publicado no Render com domínio próprio e atualização automática a partir do GitHub.

---

## Como rodar localmente

```bash
git clone [https://github.com/Dayanebiaerafa/confeitaria-ecommerce-mercadopago.git](https://github.com/Dayanebiaerafa/confeitaria-ecommerce-mercadopago.git)
cd confeitaria-ecommerce-mercadopago
python -m venv .venv
# Ative o ambiente virtual:
# Windows: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Variáveis de ambiente necessárias (exemplo): DATABASE_URL, MP_ACCESS_TOKEN, etc.

---
## Aprendizados
Construí este projeto para resolver um problema real. Ele me ensinou a lidar com arquitetura orientada a eventos, tratar falhas de rede e webhooks repetidos, proteger dados sensíveis de clientes e integrar múltiplos serviços externos de forma confiável.

---

## 👩‍💻 Sobre a Desenvolvedora
**Desenvolvido por Dayane Teodoro**  
Reside em Uberlândia - MG. 

Desenvolvedora de Software em transição de carreira, com sólida experiência em gestão de processos e foco em automação inteligente. Graduada em Análise e Desenvolvimento de Sistemas (ADS).

---

## 📩 Contato
* **LinkedIn:** [Dayane Teodoro](https://www.linkedin.com/in/dayaneteodoro/)
* **Portfólio:** [confeitariadayaneteodoro.com.br](https://www.confeitariadayaneteodoro.com.br)
* **E-mail:** dayaneteodorob@outlook.com

> *"A tecnologia só faz sentido quando resolve um problema real."* 
> 
> Se este projeto agregou valor, deixe uma ⭐ no repositório!
