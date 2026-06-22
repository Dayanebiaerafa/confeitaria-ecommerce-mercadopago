import os
import re
import requests
import logging
import json
from flask import Flask, request, jsonify, render_template, make_response
from flask_cors import CORS
import mercadopago
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import pytz
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# --- CONFIGURAÇÕES INICIAIS ---
app = Flask(__name__)
CORS(app)

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
# Credenciais via Variáveis de Ambiente (Segurança Sênior)
# --- CONFIGURAÇÕES TÉCNICAS (Puxando do Render) ---
DATABASE_URL = os.getenv("DATABASE_URL")
MP_TOKEN = os.getenv("MP_ACCESS_TOKEN")
SENHA_ADMIN = os.getenv("ADMIN_PASSWORD")
SHEET_ID = os.getenv("SHEET_ID")

# 🌟 ADICIONE ESSAS DUAS LINHAS AQUI NO TOPO:
GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Credenciais do Google (Puxando do Render)
GOOGLE_EMAIL = os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL")
GOOGLE_KEY = os.getenv("GOOGLE_PRIVATE_KEY")
GOOGLE_KEY_ID = os.getenv("GOOGLE_PRIVATE_KEY_ID")

# Credenciais da Meta (Puxando do Render)
# Dica: Verifique se no Render o nome é WA_PHONE_TOKEN mesmo
TOKEN_META = os.getenv("WA_PHONE_TOKEN") 
ID_TELEFONE_WHATSAPP = os.getenv("WA_PHONE_ID_FACE") 
SEU_NUMERO_PESSOAL = os.getenv("SEU_NUMERO")
VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN")

sdk = mercadopago.SDK(MP_TOKEN)

def mascarar_dados(texto):
    if not texto: return "N/A"
    # Exemplo: 123.456.789-01 -> ***.456.789-**
    return f"***.{texto[4:11]}-**"


def obter_cliente_gspread():
    """Centraliza a conexão com o Google Sheets."""
    GOOGLE_EMAIL = os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL")
    GOOGLE_KEY = (os.getenv("GOOGLE_PRIVATE_KEY") or "").replace('\\n', '\n')
    GOOGLE_KEY_ID = os.getenv("GOOGLE_PRIVATE_KEY_ID")

    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    
    creds_dict = {
        "type": "service_account",
        "project_id": GOOGLE_PROJECT_ID,      # 👈 Puxa direto do topo agora
        "private_key_id": GOOGLE_KEY_ID,
        "private_key": GOOGLE_KEY,
        "client_email": GOOGLE_EMAIL,
        "client_id": GOOGLE_CLIENT_ID,        # 👈 Puxa direto do topo agora
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{GOOGLE_EMAIL}"
    }
    
    creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    return gspread.authorize(creds)


# Configuração do Log (Arquivo local)
logging.basicConfig(
    filename='pedidos_backup.log',
    level=logging.DEBUG,
    format='%(asctime)s | %(levelname)s | %(message)s'
)





# --- FUNÇÕES DE AUTOMAÇÃO  ---
def avisar_venda_para_dayane(nome_cliente, valor, link):
    if not ID_TELEFONE_WHATSAPP or not TOKEN_META:
        logging.error("❌ Erro: ID_TELEFONE_WHATSAPP ou TOKEN_META ausentes")
        return

    NUMERO_DAYANE = SEU_NUMERO_PESSOAL
    url = f"https://graph.facebook.com/v21.0/{ID_TELEFONE_WHATSAPP}/messages"
            
    texto_valor = valor if "R$" in str(valor) else f"R$ {valor}"

    # Mensagem personalizada para você com o link clicável
    corpo_zap = (
        f"🍰 *NOVO PEDIDO APROVADO!*\n\n"
        f"👤 *Cliente:* {nome_cliente}\n"
        f"💰 *Valor Total:* {texto_valor}\n\n"
        f"📝 *DETALHES DO PEDIDO:* \n{link}\n\n"
        f"✅ Verifique a planilha e prepare o forno!"
    )

    data = {
        "messaging_product": "whatsapp",
        "to": NUMERO_DAYANE, 
        "type": "text",
        "text": {"body": corpo_zap}
    }
    
    try:
        response = requests.post(url, json=data, headers={"Authorization": f"Bearer {TOKEN_META}"})
        if response.status_code in [200, 201]:
            print("✅ Notificação enviada com sucesso para a Dayane!")
        else:
            print(f"❌ Erro da API da Meta ao avisar Dayane: {response.text}")
            logging.error(f"❌ Erro ao avisar Dayane: {response.text}")
    except Exception as e:
        print(f"💥 Falha ao enviar aviso para Dayane: {e}")
        logging.error(f"💥 Falha ao enviar aviso para Dayane: {e}")



@app.route('/confirmacao/<id_transacao>')
def confirmacao_cliente(id_transacao):
    # 🌟 ABORDAGEM SÊNIOR: Tenta buscar primeiro no Banco de Dados
    pedido = None
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM pedidos WHERE mp_id = %s OR id = %s", (str(id_transacao), str(id_transacao)))
                row = cur.fetchone()
                if row:
                    raw_data = row['dados_completos']
                    pedido = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                    pedido['id'] = row['id']
                    pedido['status'] = row['status']
                    print(f"✅ [CONFIRMAÇÃO] Pedido localizado no Banco de Dados.")
    except Exception as db_err:
        print(f"⚠️ Erro ao buscar no banco: {db_err}")

    # 🌟 SEGUNDO PASSO SÊNIOR: Sempre buscar na Planilha para enriquecer os dados incompletos do JSON
    print(f"🔄 Enriquecendo dados do pedido com as informações em tempo real do Google Sheets...")
    dados_planilha = buscar_dados_pedido(id_transacao)
    
    if dados_planilha and isinstance(dados_planilha, dict):
        if not pedido:
            pedido = dados_planilha
        else:
            # Mescla os dados: se a planilha tiver a informação, ela sobrepõe o JSON capenga
            for chave, valor in dados_planilha.items():
                if valor and valor != "N/A":
                    pedido[chave] = valor

    if not pedido:
        return "Pedido em processamento... Por favor, atualize a página em instantes.", 404
    
    # 🌟 TRATAMENTO PARA MULTIPLOS ITENS (BOLOS)
    if 'itens' in pedido and isinstance(pedido['itens'], str):
        try:
            pedido['itens'] = json.loads(pedido['itens'].replace("'", '"'))
        except:
            pass

    if isinstance(pedido, list):
        pedido = {"itens": pedido}

    if not pedido.get('itens') and pedido.get('json'):
        if isinstance(pedido['json'], str):
            try:
                pedido['itens'] = json.loads(pedido['json'].replace("'", '"'))
            except:
                pedido['itens'] = []

    # Se ainda assim não houver itens estruturados, simula um para o loop do HTML rodar
    if not pedido.get('itens'):
        pedido['itens'] = [{
            'titulo': pedido.get('titulo', 'Bolo Temático'),
            'formato': pedido.get('formato'),
            'peso': pedido.get('peso'),
            'preferencia_peso': pedido.get('preferencia_peso') or pedido.get('preferenciaPeso'),
            'massa': pedido.get('massa'),
            'recheios': pedido.get('recheios'),
            'complemento': pedido.get('complemento') or pedido.get('complementos'),
            'topo': pedido.get('topo'),
            'embalagem': pedido.get('embalagem')
        }]

    # 🌟 RESOLVENDO O PROBLEMA DOS DOCES EM JSON BRUTO
    if 'doces' in pedido and pedido['doces']:
        doces_bruto = pedido['doces']
        if isinstance(doces_bruto, str) and (doces_bruto.startswith('{') or doces_bruto.startswith('[')):
            try:
                doces_dados = json.loads(doces_bruto.replace("'", '"'))
                if isinstance(doces_dados, dict):
                    lista_doces = [f"{qtd} uni de {nome}" for nome, qtd in doces_dados.items() if qtd]
                    pedido['doces'] = ", ".join(lista_doces)
                elif isinstance(doces_dados, list):
                    lista_doces = []
                    for item in doces_dados:
                        if isinstance(item, dict):
                            nome = item.get('nome') or item.get('titulo')
                            qtd = item.get('quantidade') or item.get('qtd')
                            if nome and qtd:
                                lista_doces.append(f"{qtd} uni de {nome}")
                    pedido['doces'] = ", ".join(lista_doces) if lista_doces else doces_bruto
            except:
                pass
        elif isinstance(doces_bruto, dict):
            lista_doces = [f"{qtd} uni de {nome}" for nome, qtd in doces_bruto.items() if qtd]
            pedido['doces'] = ", ".join(lista_doces)

    # 🌟 CORREÇÃO DE PATRONIZAÇÃO DO CLIENTE
    if 'cliente' not in pedido:
        pedido['cliente'] = {
            'nome': pedido.get('nome', 'Cliente'),
            'telefone': pedido.get('telefone', '')
        }
    elif not pedido['cliente'].get('nome'):
        pedido['cliente']['nome'] = pedido.get('nome', 'Cliente')

    pedido['nome'] = pedido['cliente']['nome']

    # 🌟 TRATAMENTO DE DATAS
    data_bruta = pedido.get('data_pedido') or pedido.get('data') or "Data não informada"
    if '-' in str(data_bruta):
        try:
            partes = str(data_bruta).split(' ')[0].split('-')
            if len(partes) == 3:
                data_bruta = f"{partes[2]}/{partes[1]}/{partes[0]}"
        except:
            pass
            
    horario = pedido.get('horario_pedido') or pedido.get('horario') or "Horário não informado"
    pedido['data_exibicao'] = data_bruta
    pedido['horario_exibicao'] = horario
    pedido['retirada_combinada'] = f"{data_bruta} às {horario}"

    # MIGRAR CHAVES FINANCEIRAS E GARANTIR FALLBACKS DA PLANILHA
    if not pedido.get('total') and pedido.get('valor_total'): pedido['total'] = pedido.get('valor_total')
    if not pedido.get('pago') and pedido.get('valor_pago'): pedido['pago'] = pedido.get('valor_pago')
    if not pedido.get('restante') and pedido.get('valor_restante'): pedido['restante'] = pedido.get('valor_restante')
    if not pedido.get('metodo') and pedido.get('pagamento_metodo'): pedido['metodo'] = pedido.get('pagamento_metodo')
    if not pedido.get('metodo') and pedido.get('forma_pagamento'): pedido['metodo'] = pedido.get('forma_pagamento')

    # Alinhamento unificado das preferências e caminhos da Planilha para a Raiz
    if pedido.get('preferencia_peso'): pedido['preferencia_peso'] = pedido.get('preferencia_peso')
    elif pedido.get('preferenciaPeso'): pedido['preferencia_peso'] = pedido.get('preferenciaPeso')
        
    if not pedido.get('forminhas') and pedido.get('cor_forminhas'): pedido['forminhas'] = pedido.get('cor_forminhas')
    if not pedido.get('obs') and pedido.get('observacoes_gerais'): pedido['obs'] = pedido.get('observacoes_gerais')
    if not pedido.get('obs') and pedido.get('observacao'): pedido['obs'] = pedido.get('observacao')

    # 🌟 UNIFICAÇÃO DOS LOOPS (Remove as repetições conflituosas e amarra as regras de negócio)
    
    if pedido.get('itens'):
        for item in pedido['itens']:
            if isinstance(item, dict):
                # 1. Garante a preferência de peso correta da planilha
                item['preferencia_peso'] = item.get('preferencia_peso') or item.get('preferenciaPeso') or pedido.get('preferencia_peso')
                
                # 2. Faz o mapeamento seguro dos estados de topo por item
                item['topo_status'] = item.get('topo_status') or item.get('topo') or pedido.get('topo_status') or pedido.get('topo')
                item['topo_detalhes'] = item.get('topo_detalhes') or item.get('nomeTopo') or pedido.get('topo_detalhes')
                
                # ✅ GARANTE A OBSERVAÇÃO DO TOPO VINDA DA PLANILHA
                item['obsTopo'] = item.get('obsTopo') or item.get('topo_obs') or pedido.get('obsTopo') or pedido.get('topo_obs')

                # 3. Trava de isolamento para Clássicos / Corte (Evita herdar dados de outro bolo)
                titulo_bolo = str(item.get('titulo') or pedido.get('titulo') or '').upper()
                if 'CLÁSSICO' in titulo_bolo or 'CLASSICO' in titulo_bolo or 'CORTE' in titulo_bolo:
                    item['topo_detalhes'] = None
                    item['nomeTopo'] = None
                    item['obsTopo'] = None  # Limpa para não misturar no bolo clássico


    # SANITIZAÇÃO FINANCEIRA (Lógica idêntica ao WhatsApp)
    def limpar_valor_financeiro(valor):
        if valor is None: return 0.0
        if isinstance(valor, (int, float)): return float(valor)
        try:
            v_str = str(valor).strip().upper().replace("R$", "").replace(" ", "")
            if "," in v_str and "." in v_str: v_str = v_str.replace(".", "").replace(",", ".")
            elif "," in v_str: v_str = v_str.replace(",", ".")
            return float(v_str) if v_str else 0.0
        except: return 0.0

    total_limpo = limpar_valor_financeiro(pedido.get('total'))
    pago_limpo = limpar_valor_financeiro(pedido.get('pago'))

    if total_limpo > 0:
        sinal_calculado = total_limpo / 2
        if pago_limpo >= (total_limpo - 0.5):
            sinal_exibicao = total_limpo
            falta_pagar = 0.0
        else:
            sinal_exibicao = sinal_calculado
            falta_pagar = sinal_calculado
    else:
        sinal_exibicao = 0.0
        falta_pagar = 0.0

    pedido['total'] = total_limpo
    pedido['pago'] = sinal_exibicao
    pedido['restante'] = falta_pagar
    pedido['metodo'] = pedido.get('metodo') or 'Não informado'

    # --- RASTREIO DE VISUALIZAÇÃO NO GOOGLE SHEETS ---
    if not pedido.get('visto_em') or pedido.get('visto_em') == "N/A":
        try:
            client = obter_cliente_gspread()
            sheet = client.open_by_key(os.getenv("SHEET_ID")).worksheet("PEDIDOS")
            celulas = sheet.findall(str(id_transacao))
            if celulas:
                celula = celulas[-1] 
                agora = datetime.now(pytz.timezone('America/Sao_Paulo')).strftime('%d/%m/%Y %H:%M')
                sheet.update_cell(celula.row, 28, agora) 
                print(f"✅ DEBUG: Visto gravado com sucesso.")
        except Exception as e:
            print(f"💥 ERRO NA GRAVAÇÃO DO VISTO: {str(e)}")
            
    response = make_response(render_template('confirmacao.html', pedido=pedido))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response

def buscar_dados_pedido(id_transacao):
    try:
        client = obter_cliente_gspread()
        sheet = client.open_by_key(os.getenv("SHEET_ID")).worksheet("PEDIDOS")

        celulas = sheet.findall(str(id_transacao))
        if celulas:
            celula = celulas[-1] 
            d = sheet.row_values(celula.row)
            
            while len(d) < 29: 
                d.append("N/A")

            def converter_para_lista(valor):
                try:
                    return json.loads(valor.replace("'", '"')) if valor and valor != "N/A" else []
                except:
                    return []
            
            try:
                data_bruta = str(d[19]) 
                if '-' in data_bruta:
                    partes = data_bruta.split('-')
                    # 🌟 CORREÇÃO: Ajustado de hífen para barra formatada padrão Brasil
                    data_valor = f"{partes[2]}/{partes[1]}/{partes[0]}"
                else:
                    data_valor = data_bruta
            except:
                data_valor = d[19]

            try:
                combinado = str(d[4]) 
                horario_valor = combinado.split(' ', 1)[1].strip() if ' ' in combinado else combinado
            except:
                horario_valor = "Não informado"

            return {
                "id": d[0],              
                "data_registro": d[1],    
                "nome": d[2],             
                "telefone": d[3],         
                "retirada_combinada": d[4],                  
                "data_pedido": data_valor,    
                "horario_pedido": horario_valor, 
                "peso": d[5],             
                "formato": d[7],          
                "itens": converter_para_lista(d[28]),            
                "fotos": d[9],            
                "massa": d[10],           
                "recheios": d[11],        
                "complementos": d[12],    
                "doces": d[13],           
                "forminhas": d[14],       
                "topo_status": d[15],     
                "topo_detalhes": d[16],   
                "embalagem": d[17],       
                "obs": d[18],             
                "total": d[20],           
                "pago": d[21],            
                "restante": d[22],        
                "metodo": d[23],          
                "status": d[24],          
                "endereco": d[25],        
                "documento": d[26],       
                "visto_em": d[27] if len(d) > 27 else None 
            }
        return None
    except Exception as e:
        logging.error(f"❌ Erro ao buscar pedido: {e}")
        return None

def limpar_telefone(tel):
    if not tel:
        return ""
    # Mantém apenas números
    numeros = "".join(filter(str.isdigit, str(tel)))
    # Garante o prefixo 55
    if not numeros.startswith("55"):
        numeros = "55" + numeros
    return numeros

def enviar_whatsapp_oficial(pedido):
    logging.info(f"DEBUG WHATSAPP - DADOS RECEBIDOS: {pedido}")
    url = f"https://graph.facebook.com/v21.0/{ID_TELEFONE_WHATSAPP}/messages"
    
    # 1. Captura os dados do cliente com segurança
    c = pedido.get('cliente', {})
    nome_cliente = c.get('nome') or 'Cliente'
    id_transacao = pedido.get('id_pedido') or pedido.get('id')
    
    # ✅ DEFININDO A VARIÁVEL CORRETA AQUI:
    telefone_bruto = c.get('telefone') or ''
    telefone_cliente = limpar_telefone(telefone_bruto)
    
    # 2. Processamento Financeiro
    total = float(pedido.get('valor_total') or pedido.get('transaction_amount') or 0)
    pago = float(pedido.get('valor_pago') or 0)

    if total > 0:
        sinal_calculado = total / 2
        if pago >= (total - 0.5):
            sinal_exibicao = total
            falta_pagar = 0.0
        else:
            sinal_exibicao = sinal_calculado
            falta_pagar = sinal_calculado
    else:
        sinal_exibicao = 0.0
        falta_pagar = 0.0

    total_str = f"R$ {total:.2f}"
    sinal_str = f"R$ {sinal_exibicao:.2f}"
    falta_str = f"R$ {falta_pagar:.2f}"

    link_confirmacao = f"https://confeitariadayaneteodoro.com.br/confirmacao/{id_transacao}"
    
    # 3. Montagem do Payload para o Cliente
    payload_cliente = {
        "messaging_product": "whatsapp",
        "to": telefone_cliente,  # Usando a variável que definimos lá em cima
        "type": "template",
        "template": {
            "name": "confirmacao_pedido_confeitaria",
            "language": { "code": "pt_BR" },
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        { "type": "text", "text": str(nome_cliente) },
                        { "type": "text", "text": link_confirmacao },
                        { "type": "text", "text": str(total_str) },
                        { "type": "text", "text": str(sinal_str) },
                        { "type": "text", "text": str(falta_str) }
                    ]
                }
            ]
        }
    }

    try:
        headers = {"Authorization": f"Bearer {TOKEN_META}", "Content-Type": "application/json"}
        
        # ==========================================
        # 1º DISPARO: ENVIAR PARA O CLIENTE
        # ==========================================
        print(f"📡 Disparando Template para o Cliente: {telefone_cliente}")
        resp_cliente = requests.post(url, json=payload_cliente, headers=headers, timeout=10)
        
        if resp_cliente.status_code in [200, 201]:
            print("✅ Template enviado com sucesso para o Cliente!")
            
            # ==========================================
            # 2º DISPARO: ENVIAR O MESMO TEMPLATE PARA A EMPRESA
            # ==========================================
            NUMERO_DAYANE = SEU_NUMERO_PESSOAL
            
            payload_dayane = payload_cliente.copy()
            payload_dayane["to"] = NUMERO_DAYANE
            
            print(f"📡 Disparando Cópia do Template para a Empresa (Dayane)...")
            resp_dayane = requests.post(url, json=payload_dayane, headers=headers, timeout=10)
            
            if resp_dayane.status_code in [200, 201]:
                print("✅ Cópia do template entregue com sucesso no seu WhatsApp!")
            else:
                print(f"❌ API aceitou o cliente, mas falhou na cópia para a empresa: {resp_dayane.text}")

            return "Sucesso"
        else:
            print(f"❌ Erro da API da Meta ao enviar para cliente: {resp_cliente.text}")
            return f"Erro Meta Cliente: {resp_cliente.text}"
            
    except Exception as e:
        print(f"💥 Erro crítico no fluxo de disparo duplo: {str(e)}")
        return f"Erro: {str(e)}"
    
    

def salvar_pedido_seguro(dados):
    client = obter_cliente_gspread()
    sheet = client.open_by_key(os.getenv("SHEET_ID")).worksheet("PEDIDOS")
    
    id_novo = str(dados[0])
    
    # 🌟 EXPLICAÇÃO SÊNIOR: Se o ID vier duplicado por erro do LocalStorage,
    # registrar mesmo assim é melhor do que ignorar e exibir dados velhos de 05/06.
    # Vamos verificar duplicidade apenas na mesma data atual se necessário, ou remover a trava agressiva:
    existe = sheet.find(id_novo)
    if existe:
        print(f"⚠️ Atenção: Pedido ID {id_novo} detectado na linha {existe.row}. Gravando nova linha para atualização em tempo real.")
    
    sheet.append_row(dados)
    return True

def enviar_para_planilha_google(dados_pedido):
    print(f"DEBUG DADOS: {dados_pedido}")
    try:
        
        client = obter_cliente_gspread() # CHAMA A FUNÇÃO CENTRAL
        sheet = client.open_by_key(os.getenv("SHEET_ID")).worksheet("PEDIDOS")


        fuso = pytz.timezone('America/Sao_Paulo')
        agora_sp = datetime.now(fuso).strftime('%d/%m/%Y %H:%M:%S')
        
        # 1. Captura de Dados da Raiz (Sincronizado com seu LocalStorage)
        id_pedido = dados_pedido.get('id_pedido') or dados_pedido.get('id') or "N/A"
        cpf_documento = dados_pedido.get('documento', 'N/A')

        cliente = dados_pedido.get('cliente', {})
        nome_cliente = cliente.get('nome') or dados_pedido.get('nome', 'N/A')


        # Data e Hora da Retirada (Vem do LocalStorage que salvamos no JS acima)
        # Procure primeiro na raiz (onde o ...dadosCarrinho joga os dados)
        data_entrega = dados_pedido.get('data_pedido') or "N/A"
        horario_entrega = dados_pedido.get('horario_pedido') or "N/A"

        # Se o campo no seu LocalStorage for 'data_entrega' em vez de 'data', ajuste acima.
        data_hora_combinada = f"{data_entrega} {horario_entrega}"
        
        # Primeiro pegamos o valor bruto de onde ele estiver
        tel_valor_bruto = str(cliente.get('telefone') or dados_pedido.get('telefone', ''))
        # Agora limpamos deixando apenas números para a planilha
        telefone_cliente = "".join(filter(str.isdigit, tel_valor_bruto)) or "N/A"

        # Pagamento e Documento
        v_total = float(dados_pedido.get('valor_total', 0))
        v_pago = float(dados_pedido.get('valor_pago', 0))
        v_restante = v_total - v_pago

        cpf_documento = dados_pedido.get('documento', 'N/A')
        metodo_pagamento = dados_pedido.get('pagamento', {}).get('metodo', 'pix')
        
        # 2. Processamento da Lista de ITENS (Bolos)
        itens = dados_pedido.get('itens', [])
        
        lista_titulos = []
        lista_fotos = []
        lista_massas = []
        lista_recheios = []
        lista_pesos = []
        lista_formatos = []
        lista_complementos = []
        lista_topos_status = []
        lista_topos_detalhes = []
        lista_embalagens = []

        for idx, item in enumerate(itens, 1):
            pfx = f"[BOLO {idx}]"
            lista_titulos.append(f"{pfx} {item.get('titulo', 'Bolo')}")
            lista_fotos.append(item.get('modeloImagem', 'N/A'))
            lista_massas.append(f"{pfx} {item.get('massa', 'N/A')}")
            
            # Recheios (é uma lista no seu log)
            rech = item.get('recheios', [])
            lista_recheios.append(f"{pfx} {', '.join(rech) if isinstance(rech, list) else rech}")
            
            lista_pesos.append(f"{pfx} {item.get('pesoKg', 0)}kg")
            lista_formatos.append(f"{pfx} {item.get('formato', 'N/A')}")
            lista_complementos.append(f"{pfx} {item.get('complemento', 'N/A')}")
            
            # Topo e Embalagem (dentro do item no seu log)
            tem_topo = "Sim" if item.get('topo') else "Não"
            lista_topos_status.append(f"{pfx} {tem_topo}")
            if item.get('topo'):
                detalhe = f"{pfx} {item.get('nomeTopo', '')}, {item.get('idadeTopo', '')} anos ({item.get('obsTopo', '')})"
                lista_topos_detalhes.append(detalhe)
            
            lista_embalagens.append(f"{pfx} {'Sim' if item.get('embalagem') else 'Não'}")

        # 3. Processamento de DOCES
        doces = dados_pedido.get('doces', [])
        resumo_doces = ", ".join([f"{d.get('qtd')}x {d.get('nome')}" for d in doces])

        # 4. Montagem da Linha Sincronizada com as Colunas da Planilha (A até AA)
        linha = [
            id_pedido,                                           # A: ID_PEDIDO
            agora_sp,                                            # B: DATA_REGISTRO
            nome_cliente,                                        # C: NOME_CLIENTE
            telefone_cliente,                                    # D: TELEFONE
            data_hora_combinada,                                # E: DATA_HORA_RETIRADA
            "\n".join(lista_pesos),                              # F: PESOKG
            dados_pedido.get('preferenciaPeso', 'N/A'),          # G: PREFERENCIA_PESO
            "\n".join(lista_formatos),                           # H: FORMATO                                                      
            "\n".join(lista_titulos),                            # I: TÍTULO
            "\n".join(lista_fotos),                              # J: FOTOS
            "\n".join(lista_massas),                             # K: MASSA
            "\n".join(lista_recheios),                           # L: RECHEIOS
            "\n".join(lista_complementos),                       # M: COMPLEMENTOS
            resumo_doces,                                        # N: RESUMO_DOCES
            dados_pedido.get('corForminhas', 'N/A'),             # O: COR_FORMINHAS
            "\n".join(lista_topos_status),                       # P: TOPO (Sim/Não)
            "\n".join(lista_topos_detalhes),                     # Q: DETALHES_TOPO
            "\n".join(lista_embalagens),                         # R: EMBALAGEM
            dados_pedido.get('observacao', 'N/A'),               # S: OBSERVACOES_GERAIS
            data_entrega,                                        # T: DATA_RETIRADA
            v_total,                                             # U: VALOR_TOTAL
            v_pago,                                              # V: VALOR_PAGO (Sinal)
            v_restante,                                          # W: VALOR_RESTANTE
            metodo_pagamento,                                    # X: PAGAMENTO_METODO
            "Aprovado",                                          # Y: STATUS
            cliente.get('endereco') or "Retirada",               # Z: ENDERECO
            cpf_documento,                                       # AA: DOCUMENTO/CPF/CNPJ
            "",                                                  # AB: visto_em (Inicia vazio)
            json.dumps(itens)                                    # AC: 28 (A NOVA COLUNA DE SEGURANÇA)
        ]

        try:
            linha_log = linha.copy()
            linha_log[26] = mascarar_dados(str(cpf_documento))
            print(f"DEBUG LINHA (Protegida): {linha_log}")
        except Exception as e:
            print(f"Erro ao gerar log mascarado: {e}")

        sheet.append_row(linha)
        logging.info(f"✅ Pedido {id_pedido} salvo com sucesso!")
        return True

    except Exception as e:
        logging.error(f"❌ Erro na planilha: {str(e)}")
        return False



# --- FUNÇÕES DE BANCO DE DADOS ---
def get_db_connection():
    # 1. Pegamos a URL da variável de ambiente do Render
    db_url = os.getenv("DATABASE_URL")
    
    # 2. Conectamos usando a URL e adicionamos sslmode=require
    # Isso é obrigatório para bancos de dados externos como o do Render
    return psycopg2.connect(db_url, sslmode='require')

def criar_tabela():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS pedidos (
                id SERIAL PRIMARY KEY,
                mp_id VARCHAR(50) UNIQUE,
                cliente_nome TEXT,
                cliente_telefone VARCHAR(20),
                valor_total DECIMAL(10,2),
                status VARCHAR(20),
                dados_completos JSONB,
                -- AJUSTE DE FUSO: Define o fuso de SP/Uberlândia como padrão
                data_criacao TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')
            );
        ''')
        conn.commit()
        cur.close()
        print("✅ Tabela verificada com fuso horário ajustado.")
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        if conn: conn.close()

# Tenta criar a tabela ao iniciar
criar_tabela()

# --- ROTAS DO SISTEMA ---

# --- ROTAS DAS PÁGINAS (FRONT-END) ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/bolodecorte')
def bolo_corte():
    return render_template('bolodecorte.html')

@app.route('/bolopersonalizado')
def bolo_personalizado():
    return render_template('bolopersonalizado.html')

@app.route('/doces')
def doces():
    return render_template('doces.html')

@app.route('/privacidade')
def privacidade():
    return render_template('privacidade.html')

@app.route('/sobre')
def sobre():
    return render_template('sobre.html')

@app.route('/sucesso')
def sucesso():
    return render_template('sucesso.html')

@app.route('/termos')
def termos():
    return render_template('termos.html')

@app.route('/exclusao')
def exclusao():
    # O Flask vai procurar o arquivo exclusao.html dentro da pasta templates
    return render_template('exclusao.html')

@app.route('/processar-pagamento', methods=['POST'])
def processar_pagamento():
    dados = request.get_json()
    logging.info(f"PEDIDO_RECEBIDO: {json.dumps(dados)}")
    
    

    try:
        metodo = dados.get('payment_method_id')
        valor = float(dados.get('transaction_amount', 0))
        
        parcelas = int(dados.get('installments', 1))

        # Montamos o dicionário COMPLETO antes de enviar
        payment_data = {
            "transaction_amount": valor,
            "description": dados.get('description', "Pedido de Bolo - Dayane Bolos"),
            "payment_method_id": metodo,
            "external_reference": dados.get('external_reference'),
            "payer": {
                "email": dados.get('payer', {}).get('email'),
                "first_name": dados.get('cliente', {}).get('nome', 'Cliente'),
                "identification": {
                    "type": dados.get('cliente', {}).get('tipoDocumento', 'CPF'), 
                    "number": dados.get('cliente', {}).get('documento')
                }
            },
            "notification_url": "https://confeitariadayaneteodoro.com.br/webhook",
        }

        if metodo != 'pix':
            payment_data["token"] = dados.get('token')
            payment_data["issuer_id"] = dados.get('issuer_id')
            # --- AQUI VOCÊ ATUALIZA A VARIÁVEL ---
            payment_data["installments"] = parcelas

        # CHAMADA ÚNICA ao Mercado Pago (Removi a duplicata que estava acima)
        payment_response = sdk.payment().create(payment_data)
        resposta = payment_response["response"]

        # --- CAMADA DE SEGURANÇA: BANCO DE DADOS ---
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO pedidos (mp_id, cliente_nome, cliente_telefone, valor_total, status, dados_completos) VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    str(resposta.get("id")) if resposta.get("id") else "FALHA_GERACAO",
                    dados.get("cliente", {}).get("nome", "Não informado"),
                    dados.get("cliente", {}).get("telefone", "Não informado"),
                    valor,
                    resposta.get("status", "error"),
                    json.dumps(dados)
                )
            )
            conn.commit()
            cur.close()
        except Exception as db_err:
            logging.error(f"❌ Erro ao salvar no Banco: {db_err}")
        finally:
            if conn: conn.close()

        # Resposta de Erro do MP
        if payment_response["status"] >= 400:
            return jsonify(resposta), payment_response["status"]

        return jsonify({
            "status": resposta.get("status"),
            "id": resposta.get("id"),
            "qr_code": resposta.get("point_of_interaction", {}).get("transaction_data", {}).get("qr_code"),
            "qr_code_base64": resposta.get("point_of_interaction", {}).get("transaction_data", {}).get("qr_code_base64")
        }), 200

    except Exception as e:
        logging.error(f"ERRO_FATAL: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/consultar-pagamento/<payment_id>', methods=['GET'])
def consultar_pagamento(payment_id):
    try:
        payment_info = sdk.payment().get(payment_id)
        status = payment_info["response"].get("status")
        # Removido todo o bloco de automação daqui. 
        # O Webhook cuidará de disparar as funções enviar_para_planilha e enviar_whatsapp_oficial.
        return jsonify({"status": status}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/logs-pedidos')
def ver_logs():
    if request.args.get('senha') != SENHA_ADMIN:
        return "Acesso Negado!", 403

    if os.path.exists('pedidos_backup.log'):
        with open('pedidos_backup.log', 'r') as f:
            linhas = f.readlines()
            return f"<html><body style='background:#1e1e1e;color:#fff;padding:20px;'><pre>{''.join(linhas[-100:])}</pre></body></html>"
    return "Nenhum log."

@app.route('/admin/painel-pedidos')
def painel_pedidos():
    if request.args.get('senha') != SENHA_ADMIN:
        return "Acesso negado", 403

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, mp_id, cliente_nome, valor_total, status, data_criacao FROM pedidos ORDER BY data_criacao DESC LIMIT 50")
        pedidos = cur.fetchall()
        
        html = """
        <html><head><title>Painel Dayane</title><style>
            body { font-family: sans-serif; background: #f4f4f4; padding: 20px; }
            table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #783606; color: white; }
            .status-approved { color: green; font-weight: bold; }
            .status-pending { color: orange; font-weight: bold; }
            .status-rejected { color: red; font-weight: bold; }
        </style></head><body>
        <h2>🎂 Últimos 50 Pedidos - Dayane Bolos</h2>
        <table><tr><th>ID</th><th>MP ID</th><th>Cliente</th><th>Valor</th><th>Status</th><th>Data</th></tr>
        """
        for p in pedidos:
            html += f"<tr><td>{p['id']}</td><td>{p['mp_id']}</td><td>{p['cliente_nome']}</td>"
            html += f"<td>R$ {float(p['valor_total']):.2f}</td><td class='status-{p['status']}'>{p['status']}</td>"
            html += f"<td>{p['data_criacao'].strftime('%d/%m/%Y %H:%M')}</td></tr>"
        
        return html + "</table></body></html>"
    except Exception as e:
        return f"Erro: {e}"
    finally:
        if conn: conn.close()

        

@app.route('/webhook', methods=['GET', 'POST'])
def webhook():
    print("\n" + "="*50)
    print("🔥 NOVO EVENTO RECEBIDO AGORA 🔥")
    print("="*50 + "\n")
    
    # --- 1. VALIDAÇÃO DA META (GET) ---
    if request.method == 'GET':
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')
        
        if mode == 'subscribe' and token == os.getenv("VERIFY_TOKEN"):
            logging.info("✅ Webhook validado com sucesso pela Meta!")
            return challenge, 200
        return "Token inválido", 403

    # --- 2. PROCESSAMENTO DE DADOS (POST) ---
    data = request.get_json(silent=True) or {}

    # SE O DADO VIER DA META (WHATSAPP)
    if data.get("object") == "whatsapp_business_account":
        print("\n--- 📥 CHEGOU ALGO DO WHATSAPP ---")
        print(f"JSON RECEBIDO: {data}")

        try:
            entry = data.get("entry", [{}])[0]
            change = entry.get("changes", [{}])[0]
            value = change.get("value", {})

            if "messages" in value:
                msg = value["messages"][0]
                wa_id = msg.get("from")
                tipo = msg.get("type")
                
                texto_clicado = ""
                payload_clicado = ""

                # Se for um botão de Template (Quick Reply)
                if tipo == "button":
                    texto_clicado = msg.get("button", {}).get("text", "")
                    payload_clicado = msg.get("button", {}).get("payload", "")
                
                # Se for um botão de mensagem interativa comum
                elif tipo == "interactive":
                    texto_clicado = msg.get("interactive", {}).get("button_reply", {}).get("title", "")
                    payload_clicado = msg.get("interactive", {}).get("button_reply", {}).get("id", "")

                # Validação inteligente: checa o texto ou o payload gerado pelo botão
                identificador_botao = (texto_clicado + " " + payload_clicado).lower().strip()

                if identificador_botao:
                    print(f"🎯 Botão detectado: {identificador_botao}")
                    
                    # Procura pela palavra-chave definida
                    if "confirmar" in identificador_botao:
                        logging.info(f"🚀 Disparando Oba! para: {wa_id}")
                        enviar_confirmacao_final(wa_id)

            # ✨ CORREÇÃO AQUI: Alinhado com o 'if "messages" in value:'
            # Garante resposta 200 para qualquer evento válido da conta do WhatsApp
            return "EVENT_RECEIVED", 200

        except Exception as e:
            logging.error(f"Erro Meta: {e}")
            return "OK", 200

    # --- 4. LOGICA MERCADO PAGO (PAGAMENTOS) ---
    elif data.get("type") == "payment" or "action" in data:
        payment_id = data.get("data", {}).get("id") or request.args.get("data.id")
        if not payment_id: 
            return "OK", 200

        try:
            payment_info = sdk.payment().get(payment_id)
            if payment_info["response"].get("status") != 'approved':
                return "OK", 200

            print("✅ Pagamento aprovado recebido")
            print(f"📑 Payment ID: {payment_id}")

            dados_para_automacao = None
            
            with get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM pedidos WHERE mp_id = %s", (str(payment_id),))
                    pedido = cur.fetchone()

                    if not pedido: 
                        print("❌ Pedido não encontrado no banco de dados.")
                        return "Order Not Found", 200

                    print("📦 Pedido encontrado no banco")
                    print(f"📲 Cliente: {pedido.get('telefone')}")

                    # 🚧 TRAVA DE SEGURANÇA CONTRA DUPLICIDADE 🚧
                    if pedido['status'] == 'approved':
                        print(f"⚠️ Webhook duplicado detectado para o pedido {pedido['id']}. Automações já foram rodadas anteriormente.")
                        return "OK", 200  

                    # Atualizamos o banco IMEDIATAMENTE para bloquear as próximas requisições coladas.
                    cur.execute("UPDATE pedidos SET status = 'approved' WHERE mp_id = %s", (str(payment_id),))
                    conn.commit()

                    raw_data = pedido['dados_completos']
                    dados_para_automacao = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                    dados_para_automacao['id_pedido'] = pedido['id']

            # Fora do bloco 'with conn' para liberar o banco de dados rápido
            if dados_para_automacao:
                print(f"🚀 Iniciando automações pós-venda para o pedido: {dados_para_automacao['id_pedido']}")
                executar_automacoes_pos_venda(dados_para_automacao)

            return "OK", 200

        except Exception as e:
            logging.error(f"💥 Erro Mercado Pago: {e}")
            return "Error", 500

    # Resposta padrão para qualquer outro tipo de sinal
    return "OK", 200

def enviar_confirmacao_final(telefone):
    # Usando v21.0 que é a versão de longo prazo (LTS) mais segura
    url = f"https://graph.facebook.com/v21.0/{ID_TELEFONE_WHATSAPP}/messages"
    
    # 1. Limpeza do número
    telefone_limpo = "".join(filter(str.isdigit, str(telefone)))
    
    # 2. Garante o prefixo do Brasil (55)
    if not telefone_limpo.startswith("55"):
        telefone_limpo = "55" + telefone_limpo
    
    print(f"\n--- 📤 TENTANDO ENVIO WHATSAPP ---")
    print(f"Destinatário: {telefone_limpo}")

    payload = {
        "messaging_product": "whatsapp",
        "to": telefone_limpo,
        "type": "text",
        "text": {"body": "Oba! 🎉 Pedido confirmado com sucesso, já estamos preparando tudo por aqui com muito carinho. Caso precise de qualquer alteração, é só nos chamar! Até logo! ✨"}
    }
    
    try:
        headers = {
            "Authorization": f"Bearer {TOKEN_META}", 
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        # LOGS DE RESPOSTA (Fundamentais para achar o erro)
        print(f"STATUS CODE: {response.status_code}")
        print(f"RESPOSTA BRUTA DA META: {response.text}")

        if response.status_code in [200, 201]:
            logging.info(f"✅ Sucesso! Mensagem enviada para {telefone_limpo}")
        else:
            logging.error(f"❌ Erro na Meta API: {response.text}")
            
    except Exception as e:
        logging.error(f"💥 Falha crítica no envio: {e}")


def executar_automacoes_pos_venda(pedido):
    print(f"🚀 Iniciando automações para o pedido: {pedido.get('id') or pedido.get('id_pedido')}")
    
    # 1. Enviar para a Planilha
    try:
        enviar_para_planilha_google(pedido)
        print("✅ Comando de envio para Planilha disparado.")
    except Exception as e:
        print(f"❌ ERRO NA PLANILHA: {e}")

    # 2. Enviar WhatsApp para o Cliente e avisar a Dayane
    print("🚀 Chamando API do whatsApp")
    print("📩 Template: confirmacao_pedido_confeitaria")
    try:
        # ✅ A própria 'enviar_whatsapp_oficial' já cuida de mandar para o cliente E para você!
        enviar_whatsapp_oficial(pedido)
        print("✅ Fluxo de mensagens executado.")
    except Exception as e:
        print(f"❌ ERRO NO FLUXO DE WHATSAPP: {e}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)