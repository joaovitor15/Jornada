'use client';

import { useState } from 'react';
import { text } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { stockAnalysisFlow } from '@/ai/flows/stock-price-flow';
import { Loader2 } from 'lucide-react';

export default function InvestmentsPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleAnalyse = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult('');
    try {
      const response = await stockAnalysisFlow(prompt);
      setResult(response);
    } catch (e) {
      console.error(e);
      setResult('Ocorreu um erro ao analisar a ação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{text.sidebar.investments}</h1>
      <p className="text-muted-foreground mb-6">
        {/* Adicione aqui uma descrição para a página de investimentos se desejar. */}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Análise de Ações com IA</CardTitle>
          <CardDescription>
            Pergunte sobre uma ação (ex: "Qual o preço da PETR4?") e a IA usará uma ferramenta para buscar a cotação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Qual o preço da MGLU3?"
              disabled={loading}
            />
            <Button onClick={handleAnalyse} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analisar
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm">{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
