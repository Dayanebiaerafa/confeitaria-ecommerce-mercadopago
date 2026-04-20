# 🍰 Confeitaria Full Stack & Automação Inteligente
> **Solução de E-commerce do Zero: Da interface de usuário à automação de ERP com IA.**

Este projeto não é apenas um site de vendas, mas um **ecossistema de automação de negócios**. Ele resolve problemas reais de logística, atendimento e pagamentos de uma confeitaria profissional, integrando Cloud Computing, Inteligência Artificial e Engenharia de Dados.

---

## Demonstração em Vídeo
* [**Assista ao Site em Funcionamento (Checkout e Fluxo)**](COLOQUE_O_LINK_AQUI)
* [**Assista à Assistente Inteligente (Gemini AI) em Ação**](COLOQUE_O_LINK_AQUI)
* [**Acessa o Site**](https://www.confeitariadayaneteodoro.com.br/)

---

## Arquitetura do Sistema e Decisões Técnicas
O sistema foi desenhado seguindo princípios de **Clean Code** e **Separação de Responsabilidades (SoC)**:

### Front-end: Performance e UX (JavaScript, HTML, CSS)
* **Engine de Sacola:** Lógica em JavaScript Vanilla para validação de regras de negócio complexas (pesos mínimos por categoria, regra de permissão de datas para 1 e 2 dias dependendo da categoria e limites de recheio e complemeto) sem necessidade de requisições constantes ao servidor.
* **Upload de Assets:** Integração com a **API ImgBB** para processamento de imagens de referência enviadas pelo cliente, otimizando o armazenamento do servidor principal.
* **Interface Responsiva:** Design focado em conversão mobile, onde ocorre a maior parte das interações do setor.

### Inteligência Artificial: Suporte com Gemini 2.5 Flash
* **Agentic Workflow:** Implementação de um assistente de suporte que utiliza lógica de **RAG (Retrieval-Augmented Generation)** via Google Apps Script para responder com base nas políticas reais da empresa (prazos, taxas de entrega em Uberlândia, sabores disponíveis, endereço da confeitaria e valores).

### Back-end: Segurança e Robustez (Python, Flask, PostgreSQL)
* **Persistência de Dados:** Uso de **PostgreSQL** hospedado no **Render** para garantir integridade referencial dos pedidos e logs de auditoria.
* **Segurança:** Implementação de **Environment Variables** (Variáveis de Ambiente) para proteção de Secrets. O sistema segue a boa prática de nunca expor chaves de API ou credenciais no código-fonte.
* **Checkout Transparente:** Integração nativa com a API do **Mercado Pago**, garantindo conformidade com padrões de segurança financeira e retenção de usuários no ambiente do site.

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
| **IA & Automação** | Google Gemini API, WhatsApp Cloud API, Google Apps Script |
| **Infraestrutura** | Render (PaaS), Git, GitHub, ImgBB API |

---

## Conclusão e Aprendizados
Este projeto demonstra minha capacidade de transitar entre o desenvolvimento de interfaces amigáveis e a construção de back-ends lógicos e automatizados. Foquei em resolver problemas de **escalabilidade de atendimento** e **segurança de dados**, competências essenciais para qualquer time de tecnologia moderno.

---

## 📩 Contato

**💞Desenvolvido por Dayane Teodoro**
 
 Uberlândia - MG  
 Graduada em Análise e Desenvolvimento de Sistemas (ADS)  

 **Conecte-se comigo no LinkedIn:** [dayaneteodoro](https://www.linkedin.com/in/dayaneteodoro/)

⭐ Dica: se este projeto te inspirou, deixe uma estrela no repositório para apoiar o trabalho!
