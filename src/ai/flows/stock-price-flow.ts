'use server';
/**
 * @fileOverview Um fluxo para obter cotações de ações (simuladas).
 *
 * - getStockPrice - Uma ferramenta que retorna o preço de uma ação.
 * - stockAnalysisFlow - Um fluxo que usa a ferramenta para analisar uma ação.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Ferramenta para obter o preço da ação
export const getStockPrice = ai.defineTool(
  {
    name: 'getStockPrice',
    description: 'Retorna o valor de mercado atual de uma ação.',
    inputSchema: z.object({
      ticker: z.string().describe('O símbolo da ação (ticker). Ex: PETR4, MGLU3'),
    }),
    outputSchema: z.number(),
  },
  async (input) => {
    console.log(`Buscando preço para: ${input.ticker}`);
    // SIMULAÇÃO: Como não há uma API gratuita do Google Finance,
    // retornamos um valor aleatório para demonstrar a funcionalidade.
    // No futuro, você pode substituir por uma chamada a uma API real.
    const fakePrice = Math.random() * 200 + 10;
    return parseFloat(fakePrice.toFixed(2));
  }
);

// Prompt que utiliza a ferramenta
const stockAnalysisPrompt = ai.definePrompt({
  name: 'stockAnalysisPrompt',
  tools: [getStockPrice],
  system: "Se a pergunta do usuário for sobre uma empresa de capital aberto, inclua o preço atual da ação em sua resposta, usando a ferramenta getStockPrice para obter o preço.",
});

// Fluxo principal
const stockAnalysisFlowInternal = ai.defineFlow(
  {
    name: 'stockAnalysisFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    const llmResponse = await stockAnalysisPrompt({
      prompt: prompt,
    });
    return llmResponse.text;
  }
);

// Função exportada para ser usada no app
export async function stockAnalysisFlow(prompt: string): Promise<string> {
    return stockAnalysisFlowInternal(prompt);
}
