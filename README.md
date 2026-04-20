# 🍰 Confeitaria Full Stack & Intelligent Process Automation (IPA)
> **De UX de Alta Conversão à Engenharia de Dados: Um Ecossistema End-to-End para Escalonamento de Negócios.**

Este projeto é um **Ecossistema de Automação de Negócios** e **Backend Engineering** de alto nível. Ele resolve o ciclo completo de uma operação comercial: desde a interface de usuário (UI) reativa até a orquestração de pagamentos, persistência em banco relacional, logística automatizada via IA e comunicação omnichannel.

---

## Demonstração Técnica em Vídeo
* [**Assista ao Site em Funcionamento (Checkout e Fluxo)**](https://github.com/Dayanebiaerafa/confeitaria-ecommerce-mercadopago/raw/main/static/assets/assistente/site.mp4)
* [**Assista à Assistente Inteligente (Gemini AI) em Ação**](https://github.com/Dayanebiaerafa/confeitaria-ecommerce-mercadopago/raw/main/static/assets/assistente/assistente.mp4)

---

## Arquitetura de Software e Decisões de Engenharia
O sistema foi arquitetado sob os princípios de **Clean Code, SOLID** e **Event-Driven Design (Arquitetura Baseada em Eventos)**:

### Segurança e Finanças (Backend Sênior)
* **Conformidade PCI & LGPD:** Implementação de Checkout Transparente com envio de `device_id` para prevenção de fraudes. No backend, desenvolvi funções de **mascaramento de dados sensíveis** (CPF/Documentos) para logs e auditoria.
* **Gestão de Secrets:** Arquitetura "Zero-Leak" utilizando variáveis de ambiente em PaaS (Render), garantindo que chaves de API e strings de conexão de banco nunca sejam expostas.
* **Resiliência de Dados:** Sistema de **verificação de duplicidade** em tempo real antes da persistência de pedidos, evitando conflitos de transação.

### Front-end: Performance e UX (JavaScript, HTML, CSS)
* **Engine de Sacola:** Lógica em JavaScript Vanilla para validação de regras de negócio complexas (pesos mínimos por categoria, regra de permissão de datas para 1 e 2 dias dependendo da categoria e limites de recheio e complemeto) sem necessidade de requisições constantes ao servidor.
* **Upload de Assets:** Integração com a **API ImgBB** para processamento de imagens de referência enviadas pelo cliente, otimizando o armazenamento do servidor principal.
* **Interface Responsiva:** Design focado em conversão mobile, onde ocorre a maior parte das interações do setor.

### Inteligência Artificial & Comunicação Omnichannel
* **Agentic Workflow:** Implementação de um assistente de suporte que utiliza lógica de **RAG (Retrieval-Augmented Generation)** via Google Apps Script para responder com base nas políticas reais da empresa (prazos, taxas de entrega em Uberlândia, sabores disponíveis, endereço da confeitaria e valores).
* **Pipeline de Notificação Omnichannel:** Uso da **WhatsApp Cloud API (Meta)** para disparos automáticos de templates oficiais após validação de Webhooks de pagamento.
* **Sanitização de Dados e Padronização E.164:** Implementação de lógica de limpeza e formatação de strings telefônicas, garantindo a integridade dos dados enviados para as APIs da Meta e evitando falhas de entrega.
* **Rastreio de Visualização:** Implementação de lógica de diagnóstico que identifica e registra na planilha o exato momento em que o cliente visualizou a confirmação do pedido (Read Receipt técnico).
* **Webhook Reativo:** Sistema de escuta ativa que processa a resposta do usuário e confirma o sucesso da operação instantaneamente, elevando o nível de UX (User Experience).

### Back-end: Segurança e Robustez (Python, Flask, PostgreSQL)
* **Persistência de Dados:** Modelagem relacional no **PostgreSQL** para integridade de pedidos e logs de auditoria.
* **Gestão de Secrets:** Segurança avançada com variáveis de ambiente (Environment Variables) configuradas em ambiente PaaS (Render), garantindo que chaves de API e credenciais de banco de dados nunca sejam expostas.
* **Arquitetura Baseada em Eventos:** Uso de **Webhooks** para conciliação financeira em tempo real e notificações de status de pagamento.
* **Checkout Transparente (Mercado Pago API):** Implementação de pagamentos com foco em conformidade **PCI Compliance**. Utilizo o SDK V2, `device_id` para prevenção de fraudes e envio de metadados (`payer.email`, `issuer_id`) para maximizar a taxa de aprovação bancária.


---

## Automação de Processos (Business Intelligence)
O diferencial deste projeto é o meu **back-office automatizado**:

1.  **Webhooks de Pagamento:** O Flask processa notificações instantâneas do Mercado Pago.
2.  **ERP Integration:** Dados são enviados via **Google Apps Script** para uma planilha que atua como dashboard de produção.
3.  **CRM & Notificação:** Disparo automático de **WhatsApp Cloud API** (Templates Oficiais) para o cliente no momento da aprovação, reduzindo drasticamente o tempo de atendimento manual.
4.  **Agendamento Inteligente:** Criação automática de eventos no **Google Calendar** para controle de prazos de entrega.

---

## Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Linguagens** | Python, JavaScript (ES6+), SQL, HTML5, CSS3 |
| **Frameworks/Libs** | Flask, Psycopg2, Gspread, Requests, CORS |
| **Banco de Dados** | PostgreSQL (Relacional) |
| **Cloud & Deploy:** | Render (PaaS, Hospedagem e DB), Google Cloud Platform, Git, GitHub, ImgBB API.
| **IA & Automação** | Google Gemini API, WhatsApp Cloud API, Google Apps Script |
|  |  |
* **Integrações de Terceiros:**
    * **Mercado Pago SDK:** Processamento de Pix e Cartão de Crédito.
    * **Meta Graph API (WhatsApp):** Notificações oficiais via templates e mensagens de texto.
    * **Google Sheets API:** Sincronização de pedidos em tempo real para gestão operacional.

---

## Arquitetura e Diferenciais Técnicos

### 1. Persistência de Dados e Flexibilidade
O sistema utiliza **PostgreSQL** com uma estratégia de esquema flexível. Enquanto dados críticos (IDs, status) possuem colunas próprias, o payload completo do pedido é armazenado em formato `JSONB`. Isso garante que personalizações complexas de bolos (massas, recheios, topos) sejam preservadas sem a necessidade de migrações constantes no banco.

### 2. Fluxo de Automação e Webhooks (Event-Driven)
O coração do sistema é o endpoint `/webhook`, que gerencia de forma assíncrona:
* **Confirmação de Pagamento:** O sistema escuta o Mercado Pago; assim que o status muda para `approved`, as automações de pós-venda são disparadas.
* **Idempotência:** Verificação de duplicidade antes de registrar na planilha Google para evitar entradas repetidas.

### 3. Segurança e LGPD
* **Mascaramento de Dados:** Implementação de lógica para ocultar CPFs em logs de depuração.
* **Sanitização:** Função dedicada para limpeza e formatação de números de telefone padrão internacional (E.164).
* **Proteção de Rotas:** Endpoints administrativos e de debug protegidos por variáveis de ambiente e autenticação via URL.

### 4. Inteligência de Negócio
* **Cálculo Automatizado de Sinal:** O backend calcula automaticamente o valor de reserva (50%) e informa ao cliente o saldo remanescente via WhatsApp, facilitando a gestão financeira da confeitaria.

---

## Impacto no Negócio (Business Intelligence)
1. **Redução de Atendimento Manual:** IA Generativa triando dúvidas comuns 24/7.
2. **Eficiência Logística:** Agendamento automático no Google Calendar e sincronização em tempo real com dashboard de produção (Google Sheets).
3. **Escalabilidade:** Deploy automatizado com integração contínua (CI/CD) via GitHub. 

---

## Conclusão e Aprendizados
Este projeto demonstra minha capacidade de transitar entre o desenvolvimento de interfaces amigáveis e a construção de back-ends lógicos e automatizados. Foquei em resolver problemas de **escalabilidade de atendimento** e **segurança de dados**, competências essenciais para qualquer time de tecnologia moderno.

---

## 👩‍💻 Sobre a Desenvolvedora
**💞Desenvolvido por Dayane Teodoro**
Reside em Uberlândia - MG 
Desenvolvedora de Software em transição de carreira, com sólida experiência em gestão de processos e foco em automação inteligente e Ciência de Dados. Graduada em Análise e Desenvolvimento de Sistemas (ADS).

---

## 📩 Contato

 **Conecte-se comigo no LinkedIn:** 
 * [**Linkedin:**](https://www.linkedin.com/in/dayaneteodoro/) Dayane Teodoro

 * [**Portfólio:**](https://www.confeitariadayaneteodoro.com.br/) www.confeitariadayaneteodoro.com.br


"A tecnologia só faz sentido quando resolve um problema real." Se este projeto agregou valor, deixe uma ⭐ no repositório!

#python #flask #postgresql #automation #whatsapp-api #gemini-api #data-science #backend
