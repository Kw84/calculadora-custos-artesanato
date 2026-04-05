/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Package, 
  Clock, 
  Flame, 
  TrendingUp, 
  Info,
  Share2,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  Copy,
  ExternalLink,
  Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Ingredient {
  id: string;
  name: string;
  totalPrice: number;
  totalQuantity: number;
  usedQuantity: number;
  unit: string;
}

interface Packaging {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

// --- Security & Validation Helpers ---

const MAX_TEXT_LENGTH = 50;
const MAX_NUMBER_VALUE = 9999999;

const sanitizeString = (str: string): string => {
  // Remove any HTML tags and limit length
  return str.replace(/<[^>]*>?/gm, '').substring(0, MAX_TEXT_LENGTH);
};

const validateNumber = (val: number): number => {
  if (isNaN(val) || val < 0) return 0;
  if (val > MAX_NUMBER_VALUE) return MAX_NUMBER_VALUE;
  return val;
};

const validateImportedData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;

  try {
    const hasValidIngredients = Array.isArray(data.ingredients) && data.ingredients.every((i: any) => 
      typeof i.id === 'string' && 
      typeof i.name === 'string' && i.name.length <= MAX_TEXT_LENGTH &&
      typeof i.totalPrice === 'number' && i.totalPrice >= 0 && i.totalPrice <= MAX_NUMBER_VALUE &&
      typeof i.totalQuantity === 'number' && i.totalQuantity > 0 && i.totalQuantity <= MAX_NUMBER_VALUE &&
      typeof i.usedQuantity === 'number' && i.usedQuantity >= 0 && i.usedQuantity <= MAX_NUMBER_VALUE &&
      typeof i.unit === 'string'
    );

    const hasValidPackaging = Array.isArray(data.packaging) && data.packaging.every((p: any) => 
      typeof p.id === 'string' && 
      typeof p.name === 'string' && p.name.length <= MAX_TEXT_LENGTH &&
      typeof p.unitPrice === 'number' && p.unitPrice >= 0 && p.unitPrice <= MAX_NUMBER_VALUE &&
      typeof p.quantity === 'number' && p.quantity >= 0 && p.quantity <= MAX_NUMBER_VALUE
    );

    const hasValidLabor = data.labor && 
      typeof data.labor.hourlyRate === 'number' && data.labor.hourlyRate >= 0 && data.labor.hourlyRate <= MAX_NUMBER_VALUE &&
      typeof data.labor.hoursSpent === 'number' && data.labor.hoursSpent >= 0 && data.labor.hoursSpent <= MAX_NUMBER_VALUE;

    const hasValidMeta = 
      typeof data.indirectRate === 'number' && data.indirectRate >= 0 && data.indirectRate <= 100 &&
      typeof data.markup === 'number' && data.markup >= 0 && data.markup <= MAX_NUMBER_VALUE &&
      typeof data.yieldQuantity === 'number' && data.yieldQuantity > 0 && data.yieldQuantity <= MAX_NUMBER_VALUE &&
      typeof data.otherCosts === 'number' && data.otherCosts >= 0 && data.otherCosts <= MAX_NUMBER_VALUE;

    return hasValidIngredients && hasValidPackaging && hasValidLabor && hasValidMeta;
  } catch (e) {
    return false;
  }
};

// --- Helper Components ---

const Card = ({ children, title, icon: Icon, className = "" }: { children: React.ReactNode, title: string, icon: any, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden ${className}`}
  >
    <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-3">
      <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
        <Icon size={20} />
      </div>
      <h2 className="font-semibold text-slate-800 tracking-tight">{title}</h2>
    </div>
    <div className="p-6">
      {children}
    </div>
  </motion.div>
);

const InputGroup = ({ label, value, onChange, type = "number", suffix = "", prefix = "", step = "0.01", placeholder = "", className = "" }: any) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="text-sm font-medium text-slate-600 ml-1">{label}</label>
    <div className="relative group">
      {prefix && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
          {prefix}
        </div>
      )}
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => {
          const rawValue = e.target.value;
          if (type === "number") {
            onChange(validateNumber(parseFloat(rawValue)));
          } else {
            onChange(sanitizeString(rawValue));
          }
        }}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-700 ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  // State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [labor, setLabor] = useState({ hourlyRate: 0, hoursSpent: 0 });
  const [indirectRate, setIndirectRate] = useState(15);
  const [markup, setMarkup] = useState(100);
  const [yieldQuantity, setYieldQuantity] = useState(1);
  const [otherCosts, setOtherCosts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Load from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    
    if (dataParam) {
      try {
        // Decode base64 safely for Unicode
        const decoded = decodeURIComponent(atob(dataParam).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const data = JSON.parse(decoded);
        
        if (validateImportedData(data)) {
          setIngredients(data.ingredients);
          setPackaging(data.packaging);
          setLabor(data.labor);
          setIndirectRate(data.indirectRate);
          setMarkup(data.markup);
          setYieldQuantity(data.yieldQuantity);
          setOtherCosts(data.otherCosts);
          // Clean URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
          alert("Cálculo carregado via link com sucesso!");
        }
      } catch (e) {
        console.error("Failed to parse URL data", e);
        setError("O link de compartilhamento parece estar corrompido ou inválido.");
      }
    }
  }, []);

  // Generate Share Link
  const handleGenerateLink = () => {
    const data = { ingredients, packaging, labor, indirectRate, markup, yieldQuantity, otherCosts };
    const jsonStr = JSON.stringify(data);
    
    // Encode base64 safely for Unicode
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    }));
    
    const url = new URL(window.location.href);
    url.searchParams.set('data', base64);
    const finalUrl = url.toString();
    
    setShareUrl(finalUrl);
    navigator.clipboard.writeText(finalUrl);
    alert("Link copiado para a área de transferência!");
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(`Confira minha precificação artesanal: ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleReset = () => {
    if (confirm("Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.")) {
      setIngredients([]);
      setPackaging([]);
      setLabor({ hourlyRate: 0, hoursSpent: 0 });
      setIndirectRate(15);
      setMarkup(100);
      setYieldQuantity(1);
      setOtherCosts(0);
      setError(null);
    }
  };

  // Calculations
  const ingredientsTotal = useMemo(() => 
    ingredients.reduce((acc, item) => acc + (item.totalPrice / (item.totalQuantity || 1)) * item.usedQuantity, 0)
  , [ingredients]);

  const packagingTotal = useMemo(() => 
    packaging.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0)
  , [packaging]);

  const laborTotal = useMemo(() => labor.hourlyRate * labor.hoursSpent, [labor]);
  
  const indirectTotal = useMemo(() => ingredientsTotal * (indirectRate / 100), [ingredientsTotal, indirectRate]);

  const totalProductionCost = useMemo(() => 
    ingredientsTotal + packagingTotal + laborTotal + indirectTotal + otherCosts
  , [ingredientsTotal, packagingTotal, laborTotal, indirectTotal, otherCosts]);

  const unitCost = useMemo(() => 
    yieldQuantity > 0 ? totalProductionCost / yieldQuantity : 0
  , [totalProductionCost, yieldQuantity]);

  const suggestedPrice = useMemo(() => 
    unitCost * (1 + markup / 100)
  , [unitCost, markup]);

  // Actions
  const addIngredient = () => {
    setIngredients([...ingredients, { 
      id: crypto.randomUUID(), 
      name: '', 
      totalPrice: 0, 
      totalQuantity: 1, 
      usedQuantity: 0, 
      unit: 'g' 
    }]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    const validatedValue = typeof value === 'number' ? validateNumber(value) : (typeof value === 'string' && field === 'name' ? sanitizeString(value) : value);
    setIngredients(ingredients.map(i => i.id === id ? { ...i, [field]: validatedValue } : i));
  };

  const addPackaging = () => {
    setPackaging([...packaging, { 
      id: crypto.randomUUID(), 
      name: '', 
      unitPrice: 0, 
      quantity: 1 
    }]);
  };

  const removePackaging = (id: string) => {
    setPackaging(packaging.filter(p => p.id !== id));
  };

  const updatePackaging = (id: string, field: keyof Packaging, value: any) => {
    const validatedValue = typeof value === 'number' ? validateNumber(value) : (typeof value === 'string' && field === 'name' ? sanitizeString(value) : value);
    setPackaging(packaging.map(p => p.id === id ? { ...p, [field]: validatedValue } : p));
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-slate-800 font-sans selection:bg-orange-100 selection:text-orange-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Calculator size={24} />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-none text-slate-900">Precificação Artesanal</h1>
              <p className="text-xs text-slate-500 mt-1">Modo Temporário e Seguro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Limpar tudo"
            >
              <RotateCcw size={20} />
            </button>

            <button 
              onClick={handleGenerateLink}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-sm"
            >
              <Share2 size={18} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Share Modal/Alert */}
        <AnimatePresence>
          {shareUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8 p-6 bg-orange-50 border-2 border-orange-200 rounded-3xl shadow-lg relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Link de Compartilhamento Gerado!</h3>
                    <p className="text-xs text-slate-500">Você pode enviar este link para qualquer pessoa ou para seu próprio WhatsApp.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleWhatsAppShare}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                  >
                    <ExternalLink size={16} />
                    WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      alert("Link copiado!");
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
                  >
                    <Copy size={16} />
                    Copiar
                  </button>
                  <button 
                    onClick={() => setShareUrl(null)}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700"
            >
              <AlertTriangle size={20} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                <RotateCcw size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Ingredients */}
            <Card title="Ingredientes" icon={Calculator}>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {ingredients.map((ing) => (
                    <motion.div 
                      key={ing.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingrediente</h3>
                        <button 
                          onClick={() => removeIngredient(ing.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg shadow-sm transition-all text-xs font-bold"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputGroup 
                          label="Nome do Ingrediente" 
                          type="text" 
                          value={ing.name} 
                          onChange={(v: string) => updateIngredient(ing.id, 'name', v)}
                          placeholder="Ex: Leite Integral"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <InputGroup 
                            label="Preço Total" 
                            prefix="R$" 
                            value={ing.totalPrice} 
                            onChange={(v: number) => updateIngredient(ing.id, 'totalPrice', v)}
                          />
                          <InputGroup 
                            label="Qtd Total" 
                            value={ing.totalQuantity} 
                            onChange={(v: number) => updateIngredient(ing.id, 'totalQuantity', v)}
                            suffix={ing.unit}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputGroup 
                            label="Qtd Usada" 
                            value={ing.usedQuantity} 
                            onChange={(v: number) => updateIngredient(ing.id, 'usedQuantity', v)}
                            suffix={ing.unit}
                          />
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-600 ml-1">Unidade</label>
                            <select 
                              value={ing.unit}
                              onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-700 appearance-none"
                            >
                              <option value="g">Gramas (g)</option>
                              <option value="kg">Quilos (kg)</option>
                              <option value="ml">Mililitros (ml)</option>
                              <option value="l">Litros (l)</option>
                              <option value="un">Unidades (un)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-end justify-end">
                          <div className="text-right">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Custo Proporcional</p>
                            <p className="text-lg font-display font-bold text-orange-600">
                              R$ {((ing.totalPrice / (ing.totalQuantity || 1)) * ing.usedQuantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button 
                  onClick={addIngredient}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={20} />
                  Adicionar Ingrediente
                </button>
              </div>
            </Card>

            {/* Packaging */}
            <Card title="Embalagens" icon={Package}>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {packaging.map((pack) => (
                    <motion.div 
                      key={pack.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Embalagem</h3>
                        <button 
                          onClick={() => removePackaging(pack.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg shadow-sm transition-all text-xs font-bold"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                          <InputGroup 
                            label="Item" 
                            type="text" 
                            value={pack.name} 
                            onChange={(v: string) => updatePackaging(pack.id, 'name', v)}
                            placeholder="Ex: Pote 250g"
                          />
                        </div>
                        <InputGroup 
                          label="Preço Unitário" 
                          prefix="R$" 
                          value={pack.unitPrice} 
                          onChange={(v: number) => updatePackaging(pack.id, 'unitPrice', v)}
                        />
                        <InputGroup 
                          label="Quantidade" 
                          value={pack.quantity} 
                          onChange={(v: number) => updatePackaging(pack.id, 'quantity', v)}
                          suffix="un"
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button 
                  onClick={addPackaging}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={20} />
                  Adicionar Embalagem
                </button>
              </div>
            </Card>

            {/* Labor & Indirect */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Card title="Mão de Obra" icon={Clock}>
                <div className="space-y-4">
                  <InputGroup 
                    label="Valor da sua Hora" 
                    prefix="R$" 
                    value={labor.hourlyRate} 
                    onChange={(v: number) => setLabor({ ...labor, hourlyRate: validateNumber(v) })}
                  />
                  <InputGroup 
                    label="Tempo Gasto (Horas)" 
                    value={labor.hoursSpent} 
                    onChange={(v: number) => setLabor({ ...labor, hoursSpent: validateNumber(v) })}
                    suffix="h"
                  />
                  <div className="pt-2 text-right">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Custo do Tempo</p>
                    <p className="text-xl font-display font-bold text-slate-700">R$ {laborTotal.toFixed(2)}</p>
                  </div>
                </div>
              </Card>

              <Card title="Custos Indiretos" icon={Flame}>
                <div className="space-y-4">
                  <InputGroup 
                    label="Gás/Energia (% sobre ingredientes)" 
                    value={indirectRate} 
                    onChange={(v: number) => setIndirectRate(Math.min(100, validateNumber(v)))}
                    suffix="%"
                  />
                  <div className="p-3 bg-blue-50 rounded-xl flex gap-3 text-blue-700">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      O mercado costuma usar entre 10% e 20% para cobrir gastos difíceis de medir exatamente.
                    </p>
                  </div>
                  <div className="pt-2 text-right">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Custo Estimado</p>
                    <p className="text-xl font-display font-bold text-slate-700">R$ {indirectTotal.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Yield & Others */}
            <Card title="Rendimento e Extras" icon={TrendingUp}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputGroup 
                  label="Rendimento da Receita" 
                  value={yieldQuantity} 
                  onChange={(v: number) => setYieldQuantity(Math.max(1, validateNumber(v)))}
                  suffix="un"
                  placeholder="Quantos potes rende?"
                />
                <InputGroup 
                  label="Outros Custos (Entrega, Taxas)" 
                  prefix="R$" 
                  value={otherCosts} 
                  onChange={(v: number) => setOtherCosts(validateNumber(v))}
                  placeholder="Ex: R$ 5,00"
                />
              </div>
            </Card>

            {/* Mathematical Formulas & Transparency */}
            <div className="p-8 bg-white rounded-3xl border border-orange-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <Info size={20} />
                </div>
                <h3 className="font-display font-bold text-xl text-slate-800">Transparência nos Cálculos</h3>
              </div>
              
              <div className="space-y-8">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Para garantir total confiança nos seus resultados, detalhamos abaixo as fórmulas matemáticas exatas utilizadas por nossa calculadora:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-orange-600 text-sm mb-3">Custo de Ingredientes</h4>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 mb-3">
                      (Preço Total ÷ Qtd Total) × Qtd Usada
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Calculamos o valor exato de cada grama ou mililitro utilizado na sua receita específica.
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-orange-600 text-sm mb-3">Mão de Obra</h4>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 mb-3">
                      Valor da Hora × Tempo Gasto
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Transformamos o seu tempo de trabalho em custo financeiro real para o produto.
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-orange-600 text-sm mb-3">Custos Indiretos</h4>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 mb-3">
                      Total Ingredientes × (% Estimada)
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Estimativa para cobrir gastos de gás, energia e água (sugerido entre 10% e 20%).
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-orange-600 text-sm mb-3">Preço de Venda</h4>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 mb-3">
                      Custo Unitário × (1 + Margem ÷ 100)
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Aplicamos o seu lucro desejado sobre o custo final de cada unidade produzida.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl text-blue-800">
                    <Calculator size={18} className="shrink-0 mt-1" />
                    <div>
                      <h5 className="font-bold text-sm mb-1">Fórmula do Custo Unitário Final</h5>
                      <p className="text-xs leading-relaxed opacity-90">
                        (Soma de todos os custos + Extras) ÷ Rendimento Total = <span className="font-bold">Custo Unitário</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-8">
            <div className="sticky top-24">
              <motion.div 
                layout
                className="bg-white rounded-3xl p-8 text-slate-800 border-2 border-orange-100 shadow-xl shadow-orange-500/5 relative overflow-hidden"
              >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-50 rounded-full -ml-16 -mb-16 blur-3xl" />

                <h2 className="text-orange-600 font-bold uppercase tracking-widest text-xs mb-8 flex items-center gap-2 relative z-10">
                  <Calculator size={14} />
                  Resumo da Receita
                </h2>

                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Total Ingredientes</span>
                    <span className="font-bold text-slate-700">R$ {ingredientsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Total Embalagens</span>
                    <span className="font-bold text-slate-700">R$ {packagingTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Mão de Obra</span>
                    <span className="font-bold text-slate-700">R$ {laborTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-slate-500 text-sm font-medium">Gás/Energia</span>
                    <span className="font-bold text-slate-700">R$ {indirectTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="pt-4">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-slate-500 text-sm font-medium">Custo Total Produção</span>
                      <span className="text-2xl font-display font-black text-orange-600">R$ {totalProductionCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-slate-500 text-sm font-medium">Custo por Unidade</span>
                      <span className="text-xl font-display font-bold text-slate-800">R$ {unitCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 relative z-10">
                  <div className="mb-6">
                    <InputGroup 
                      label="Margem de Lucro (%)" 
                      value={markup} 
                      onChange={(v: number) => setMarkup(validateNumber(v))}
                      suffix="%"
                      className="!bg-slate-50 !border-slate-200"
                    />
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-center shadow-lg shadow-orange-500/30">
                    <p className="text-orange-50 text-xs font-bold uppercase tracking-widest mb-1">Preço de Venda Sugerido</p>
                    <p className="text-4xl font-display font-black text-white">R$ {suggestedPrice.toFixed(2)}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full">
                      <p className="text-orange-50 text-[10px] font-bold">
                        Lucro Bruto/Un: R$ {(suggestedPrice - unitCost).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Tip Card */}
              <div className="mt-6 p-6 bg-orange-50 rounded-2xl border border-orange-100 flex gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shrink-0 shadow-sm">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Dica de Ouro</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Não esqueça de incluir no custo o trajeto para entrega ou a taxa da maquininha de cartão. Muitas pessoas ignoram esses detalhes e acabam "pagando para trabalhar".
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Mobile Sticky Summary */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preço Sugerido</p>
            <p className="text-xl font-display font-black text-orange-600">R$ {suggestedPrice.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custo Unitário</p>
            <p className="text-lg font-display font-bold text-slate-700">R$ {unitCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-orange-100 py-12 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-2">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Aplicação desenvolvida por</p>
              <p className="text-lg font-display font-bold text-slate-800">Kelber Weike</p>
            </div>
            <a 
              href="https://www.instagram.com/kelber_weike?igsh=OTEzMDd2YTNheTc2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl font-bold text-sm shadow-lg hover:scale-105 transition-transform active:scale-95"
            >
              <Instagram size={20} />
              Siga no Instagram
            </a>
            <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
              © 2026 • Ferramenta de Apoio ao Empreendedor Artesanal
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
