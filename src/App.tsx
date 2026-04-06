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
  Instagram,
  QrCode,
  Check,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Modelos de Dados ---

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

// --- Validadores e Sanitização ---

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

// --- Componentes Auxiliares ---

const Card = ({ children, title, icon: Icon, className = "", delay = 0 }: { children: React.ReactNode, title: string, icon: any, className?: string, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`bg-white rounded-3xl card-shadow border border-slate-100 overflow-hidden ${className}`}
  >
    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-primary/5 rounded-2xl text-brand-primary border border-brand-primary/10 group-hover:bg-brand-primary group-hover:text-white transition-all duration-500">
          <Icon size={22} strokeWidth={2} />
        </div>
        <h2 className="font-display font-bold text-slate-800 tracking-tight text-lg">{title}</h2>
      </div>
    </div>
    <div className="p-8">
      {children}
    </div>
  </motion.div>
);

const InputGroup = ({ label, value, onChange, type = "number", suffix = "", prefix = "", step = "0.01", placeholder = "", className = "" }: any) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {prefix && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-primary transition-colors">
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
        className={`w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary focus:bg-white transition-all text-slate-700 font-medium placeholder:text-slate-300 ${prefix ? 'pl-11' : ''} ${suffix ? 'pr-14' : ''}`}
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 group-focus-within:text-brand-primary transition-colors">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

// --- Aplicação Principal ---

export default function App() {
  // Estado da Aplicação
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [packaging, setPackaging] = useState<Packaging[]>([]);
  const [labor, setLabor] = useState({ hourlyRate: 0, hoursSpent: 0 });
  const [indirectRate, setIndirectRate] = useState(15);
  const [markup, setMarkup] = useState(100);
  const [yieldQuantity, setYieldQuantity] = useState(1);
  const [otherCosts, setOtherCosts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showPixCopySuccess, setShowPixCopySuccess] = useState(false);

  // Carregar dados via URL ao iniciar
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

  // Gerar link de compartilhamento
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

  const copyPixKey = () => {
    navigator.clipboard.writeText('396cca9f-51b2-4e52-9fdf-716cc6a90277');
    setShowPixCopySuccess(true);
    setTimeout(() => setShowPixCopySuccess(false), 2000);
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

  // Cálculos de Custos e Preços
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

  // Ações de Manipulação de Dados
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
    <div className="min-h-screen bg-surface-base text-text-main font-sans selection:bg-brand-primary/10 selection:text-brand-primary pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-brand-secondary shadow-2xl shadow-slate-900/20 rotate-3 hover:rotate-0 transition-transform duration-500 border border-white/10">
              <Calculator size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display font-black text-xl tracking-tight text-slate-900 uppercase">Precificação</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
              title="Limpar tudo"
            >
              <RotateCcw size={20} />
            </button>

            <button 
              onClick={handleGenerateLink}
              className="hidden lg:flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
            >
              <Share2 size={18} />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        {/* Beta Disclaimer */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 rounded-3xl p-6 flex items-center gap-5 text-slate-900 border border-slate-100 card-shadow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 text-slate-200 group-hover:scale-110 transition-transform duration-700">
            <Info size={100} />
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200">
            <Info size={20} className="text-brand-primary" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Nota de Versão</p>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Esta é uma versão <strong>Beta</strong> otimizada para precisão nos cálculos. A interface está sendo aprimorada para oferecer a melhor experiência possível.
            </p>
          </div>
        </motion.div>

        {/* Share Modal/Alert */}
        <AnimatePresence>
          {shareUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200 relative overflow-hidden text-slate-900"
            >
              <div className="absolute top-0 right-0 p-8 text-slate-50">
                <Share2 size={120} />
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20">
                    <Share2 size={24} className="text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black tracking-tight">Link Gerado!</h3>
                    <p className="text-sm text-slate-500">Seus dados de precificação foram salvos e estão prontos para compartilhar.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={handleWhatsAppShare}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-brand-primary text-white px-8 py-4 rounded-2xl text-sm font-black hover:bg-brand-secondary transition-all active:scale-95 shadow-xl shadow-brand-primary/10"
                  >
                    <ExternalLink size={18} />
                    WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      alert("Link copiado!");
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-slate-100 text-slate-900 px-8 py-4 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
                  >
                    <Copy size={18} />
                    Copiar
                  </button>
                  <button 
                    onClick={() => setShareUrl(null)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                  >
                    <RotateCcw size={20} />
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-700 shadow-lg shadow-red-100/50"
            >
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0 border border-red-200">
                <AlertTriangle size={20} />
              </div>
              <p className="text-sm font-bold flex-1">{error}</p>
              <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 rounded-xl transition-colors">
                <RotateCcw size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* Ingredients */}
            <Card title="Ingredientes" icon={Package} delay={0.1}>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {ingredients.map((ing, idx) => (
                    <motion.div 
                      key={ing.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative group hover:bg-white hover:border-slate-200 hover:card-shadow transition-all duration-500"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[10px] font-black text-brand-primary border border-slate-200 shadow-sm">
                            {idx + 1}
                          </div>
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Componente</h3>
                        </div>
                        <button 
                          onClick={() => removeIngredient(ing.id)}
                          className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <InputGroup 
                          label="Nome" 
                          type="text" 
                          value={ing.name} 
                          onChange={(v: string) => updateIngredient(ing.id, 'name', v)}
                          placeholder="Ex: Tecido de Algodão"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <InputGroup 
                            label="Preço Pago" 
                            value={ing.totalPrice} 
                            onChange={(v: number) => updateIngredient(ing.id, 'totalPrice', v)}
                            prefix={<DollarSign size={14} className="text-brand-primary" />}
                          />
                          <InputGroup 
                            label="Qtd Total" 
                            value={ing.totalQuantity} 
                            onChange={(v: number) => updateIngredient(ing.id, 'totalQuantity', v)}
                            suffix={ing.unit}
                          />
                        </div>
                        <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                          <InputGroup 
                            label="Qtd Usada" 
                            value={ing.usedQuantity} 
                            onChange={(v: number) => updateIngredient(ing.id, 'usedQuantity', v)}
                            suffix={ing.unit}
                          />
                          <div className="flex flex-col justify-end pb-1 px-1">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Unidade</p>
                            <div className="flex gap-2">
                              {['g', 'ml', 'un', 'cm'].map(u => (
                                <button
                                  key={u}
                                  onClick={() => updateIngredient(ing.id, 'unit', u)}
                                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ing.unit === u ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'}`}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button 
                  onClick={addIngredient}
                  className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest group shadow-sm hover:shadow-md"
                >
                  <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                  Adicionar Ingrediente / Material
                </button>
              </div>
            </Card>

            <Card title="Embalagens" icon={Package} delay={0.2}>
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {packaging.map((pack, idx) => (
                    <motion.div 
                      key={pack.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative group hover:bg-white hover:border-slate-200 hover:card-shadow transition-all duration-500"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-[10px] font-black text-brand-primary border border-slate-200 shadow-sm">
                            {idx + 1}
                          </div>
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Embalagem</h3>
                        </div>
                        <button 
                          onClick={() => removePackaging(pack.id)}
                          className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="sm:col-span-1">
                          <InputGroup 
                            label="Item" 
                            type="text" 
                            value={pack.name} 
                            onChange={(v: string) => updatePackaging(pack.id, 'name', v)}
                            placeholder="Ex: Caixa de Presente"
                          />
                        </div>
                        <InputGroup 
                          label="Preço Unitário" 
                          value={pack.unitPrice} 
                          onChange={(v: number) => updatePackaging(pack.id, 'unitPrice', v)}
                          prefix={<DollarSign size={14} className="text-brand-primary" />}
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
                  className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest group shadow-sm hover:shadow-md"
                >
                  <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                  Adicionar Embalagem
                </button>
              </div>
            </Card>

            {/* Labor & Indirect */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <Card title="Mão de Obra" icon={Clock} delay={0.3}>
                <div className="space-y-6">
                  <InputGroup 
                    label="Valor da Hora" 
                    value={labor.hourlyRate} 
                    onChange={(v: number) => setLabor({ ...labor, hourlyRate: validateNumber(v) })}
                    prefix={<DollarSign size={14} className="text-brand-primary" />}
                  />
                  <InputGroup 
                    label="Tempo Gasto" 
                    value={labor.hoursSpent} 
                    onChange={(v: number) => setLabor({ ...labor, hoursSpent: validateNumber(v) })}
                    suffix="hrs"
                  />
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo do Tempo</p>
                    <p className="text-xl font-display font-black text-slate-900">R$ {laborTotal.toFixed(2)}</p>
                  </div>
                </div>
              </Card>

              <Card title="Custos Fixos" icon={Flame} delay={0.4}>
                <div className="space-y-6">
                  <InputGroup 
                    label="Taxa Estimada (%)" 
                    value={indirectRate} 
                    onChange={(v: number) => setIndirectRate(Math.min(100, validateNumber(v)))}
                    suffix="%"
                  />
                  <div className="p-4 bg-blue-50 rounded-2xl flex gap-4 text-blue-700 border border-blue-100">
                    <Info size={18} className="shrink-0 mt-0.5 text-blue-500" />
                    <p className="text-[11px] leading-relaxed font-medium">
                      Recomendamos entre 10% e 20% para cobrir gastos como luz, água e internet.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Indireto</p>
                    <p className="text-xl font-display font-black text-slate-900">R$ {indirectTotal.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Yield & Others */}
            <Card title="Rendimento e Extras" icon={TrendingUp} delay={0.5}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <InputGroup 
                  label="Rendimento Total" 
                  value={yieldQuantity} 
                  onChange={(v: number) => setYieldQuantity(Math.max(1, validateNumber(v)))}
                  suffix="un"
                  placeholder="Ex: 10 potes"
                />
                <InputGroup 
                  label="Outros Custos" 
                  value={otherCosts} 
                  onChange={(v: number) => setOtherCosts(validateNumber(v))}
                  prefix={<DollarSign size={14} className="text-brand-primary" />}
                  placeholder="Ex: R$ 5,00"
                />
              </div>
            </Card>

            {/* Mathematical Formulas & Transparency */}
            <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 card-shadow overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-10 text-slate-50 group-hover:scale-110 transition-transform duration-700">
                <Info size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                    <Info size={24} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">Transparência Total</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Fórmulas de Cálculo</p>
                  </div>
                </div>
                
                <div className="space-y-10">
                  <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                    Para garantir total confiança nos seus resultados, detalhamos abaixo as fórmulas matemáticas exatas utilizadas por nossa calculadora:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { title: "Ingredientes", formula: "(Preço ÷ Qtd) × Usada", desc: "Custo exato de cada grama ou mililitro." },
                      { title: "Mão de Obra", formula: "Valor Hora × Tempo", desc: "Transformamos seu tempo em custo real." },
                      { title: "Custos Fixos", formula: "Ingredientes × % Taxa", desc: "Estimativa para despesas operacionais." },
                      { title: "Preço Final", formula: "Custo Unit. × (1 + Margem)", desc: "Seu lucro aplicado sobre o custo final." }
                    ].map((f, i) => (
                      <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:card-shadow transition-all duration-500">
                        <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">{f.title}</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl font-mono text-xs text-brand-primary mb-4 border border-slate-100">
                          {f.formula}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {f.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <div className="flex items-start gap-5 p-6 bg-slate-50 rounded-3xl text-slate-900 border border-slate-200 card-shadow">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                        <Calculator size={20} className="text-brand-primary" />
                      </div>
                      <div>
                        <h5 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">Fórmula do Custo Unitário Final</h5>
                        <p className="text-sm leading-relaxed font-medium text-slate-700">
                          (Soma de Custos + Extras) ÷ Rendimento = <span className="text-brand-primary font-black">Custo Unitário</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-5 space-y-10">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="sticky top-32"
            >
              <div className="bg-white rounded-[2.5rem] p-10 text-slate-900 border border-slate-100 card-shadow relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-secondary/5 rounded-full blur-3xl" />
                
                <div className="relative z-10 space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20">
                      <TrendingUp size={24} className="text-brand-primary" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status do Projeto</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">Calculado</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preço de Venda Sugerido</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-display font-black text-slate-300">R$</span>
                      <span className="text-6xl font-display font-black tracking-tighter tabular-nums text-slate-900">
                        {suggestedPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Total</p>
                      <p className="text-xl font-display font-black tracking-tight text-slate-900">R$ {totalProductionCost.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lucro Líquido</p>
                      <p className="text-xl font-display font-black tracking-tight text-brand-primary">R$ {(suggestedPrice - unitCost).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margem de Lucro</label>
                        <span className="text-sm font-black text-brand-primary">{markup}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="300" 
                        value={markup} 
                        onChange={(e) => setMarkup(validateNumber(parseInt(e.target.value)))}
                        className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Info Card */}
              <div className="mt-6 p-6 bg-white rounded-3xl border border-slate-100 card-shadow flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shrink-0 border border-blue-100">
                  <Info size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-1">Dica de Especialista</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Não esqueça de incluir custos invisíveis como energia, internet e depreciação de ferramentas nos Custos Fixos.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* Mobile Sticky Summary */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Preço Sugerido</p>
            <p className="text-2xl font-display font-black text-slate-900 tracking-tighter">R$ {suggestedPrice.toFixed(2)}</p>
          </div>
          <button 
            onClick={handleGenerateLink}
            className="bg-brand-primary text-white p-4 rounded-2xl shadow-xl shadow-brand-primary/20 active:scale-90 transition-transform"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-24 mt-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-12">
            {/* Support Section */}
            <div className="bg-slate-50 rounded-[2.5rem] p-8 md:p-12 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 text-slate-100 group-hover:scale-110 transition-transform duration-700">
                <Briefcase size={120} />
              </div>
              
              <div className="relative z-10 max-w-2xl mx-auto text-center">
                <div className="flex flex-col items-center gap-4 mb-10">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand-primary card-shadow">
                    <QrCode size={32} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-2xl text-slate-900 tracking-tight">Apoie o Projeto</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sua doação mantém o projeto ativo</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <button 
                    onClick={copyPixKey}
                    className="w-full p-6 bg-white rounded-3xl card-shadow border border-slate-100 flex flex-col md:flex-row items-center gap-6 hover:-translate-y-1 transition-all active:scale-95 group/pix relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-emerald-500/0 group-hover/pix:bg-emerald-500/5 transition-colors" />
                    <div className="w-14 h-14 bg-[#32BCAD] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#32BCAD]/20 shrink-0 relative z-10">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0L7.66 4.34L12 8.68L16.34 4.34L12 0ZM0 12L4.34 7.66L8.68 12L4.34 16.34L0 12ZM12 24L16.34 19.66L12 15.32L7.66 19.66L12 24ZM24 12L19.66 16.34L15.32 12L19.66 7.66L24 12Z" />
                      </svg>
                    </div>
                    <div className="text-center md:text-left overflow-hidden flex-1 relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Doação via Pix (Clique para Copiar)</p>
                      <code className="text-sm font-mono font-bold text-slate-900 break-all block">396cca9f-51b2-4e52-9fdf-716cc6a90277</code>
                    </div>
                    <div className="shrink-0 relative z-10">
                      {showPixCopySuccess ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                          <Check size={16} />
                          Copiado!
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center group-hover/pix:bg-slate-900 group-hover/pix:text-white transition-colors">
                          <Copy size={18} />
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="pt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Contato Direto</p>
                    <a 
                      href="https://www.instagram.com/kelber_weike?igsh=OTEzMDd2YTNheTc2" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 px-8 py-5 bg-white text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest card-shadow hover:-translate-y-1 transition-all active:scale-95 border border-slate-100"
                    >
                      <Instagram size={20} className="text-pink-500" />
                      Instagram
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-12 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Desenvolvido por Kelber Weike
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
