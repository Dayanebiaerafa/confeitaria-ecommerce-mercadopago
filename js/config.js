// Dentro de js/config.js
export const feriadosFixos = [
    "01-01", // Ano Novo
    "01-05", // Dia do Trabalho
    "07-09", // Independência
    "12-10", // Nossa Sra Aparecida
    "02-11", // Finados
    "15-11", // Proclamação da República
    "20-11", // Consciência Negra
    "25-12"  // Natal
];

// config.js
export const CONFIG = {
    URL_PLANILHA: "https://script.google.com/macros/s/AKfycbwm2PMkt2qSnRTH9bScAOXxauAbi3sv3WmfmJ7yQN2ut66oYTvP_W5x8jhXUDu8A5Eh/exec",
    API_URL: "https://site-backend-mrgq.onrender.com",
    MP_PUBLIC_KEY: "APP_USR-1af45030-78f4-4e0e-97f1-85d464b06625"
};


// Esta função garante que o objeto mp só seja criado se o SDK estiver presente
export function obterMercadoPago() {
    // Verificamos na window e o tipo para evitar erros de referência
    if (typeof window.MercadoPago === 'undefined') {
        console.error("Erro: SDK do Mercado Pago ainda não carregado no navegador.");
        return null;
    }
    // Usamos a constante centralizada e definimos o locale para evitar bugs de moeda
    return new window.MercadoPago(CONFIG.MP_PUBLIC_KEY, { locale: 'pt-BR' });
}
// ====== 1. CONSTANTES DE PREÇO (Mantidas exatamente como as suas) ======

// Preços Base
export const PRECO_POR_KG = 95;             // Bolo Tradicional
export const PRECO_CORTE = 90;              // Bolo de Corte
export const PRECO_PERSONALIZADO = 105;      // Bolo Personalizado

// Adicionais e Topos
export const VALOR_TOPO_PERSONALIZADO = 30;
export const VALOR_TOPO_PADRAO = 20;
export const PRECO_EMBALAGEM = 15;
export const ADICIONAL_NUTELLA_GELEIA = 20; // Valor extra por KG

// Outras configurações que você pode ter (Exemplo)
export const DIAS_MINIMOS_ENCOMENDA = 2;



