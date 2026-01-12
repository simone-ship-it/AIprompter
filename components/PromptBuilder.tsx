import React, { useState, useRef, useEffect } from 'react';
import { MODEL_CATALOG, OptimizedPrompt, HistoryItem } from '../types';
import { generateVideoPrompt, ImageInput } from '../services/geminiService';
import { 
  ArrowPathIcon, 
  ClipboardDocumentIcon, 
  PhotoIcon, 
  XMarkIcon, 
  SparklesIcon, 
  VideoCameraIcon, 
  GlobeAltIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  PaintBrushIcon,
  CheckIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/solid';

const PromptBuilder: React.FC = () => {
  const [inputText, setInputText] = useState('');
  
  // Model Selection State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('kling');
  const [selectedModelId, setSelectedModelId] = useState<string>('kling-o1');
  const [customModelName, setCustomModelName] = useState<string>('');

  // Options State
  const [isShortPrompt, setIsShortPrompt] = useState<boolean>(true);
  const [includeTechParams, setIncludeTechParams] = useState<boolean>(false);
  const [fixColorShift, setFixColorShift] = useState<boolean>(true);
  const [isHighFidelity, setIsHighFidelity] = useState<boolean>(true);
  
  // Image State (Start & End Frames)
  const [startImage, setStartImage] = useState<ImageInput | null>(null);
  const [endImage, setEndImage] = useState<ImageInput | null>(null);
  // Aspect Ratio Warning State
  const [startImageWarning, setStartImageWarning] = useState<boolean>(false);
  const [endImageWarning, setEndImageWarning] = useState<boolean>(false);

  // Drag State
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizedPrompt | null>(null);
  
  // History State with Local Storage Initialization
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('cineprompt_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  });

  const [error, setError] = useState<string | null>(null);

  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);

  // Save history to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cineprompt_history', JSON.stringify(history));
  }, [history]);

  const selectedCategory = MODEL_CATALOG.find(c => c.id === selectedCategoryId);
  const selectedModelDef = selectedCategory?.models.find(m => m.id === selectedModelId);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = MODEL_CATALOG.find(c => c.id === catId);
    if (cat && cat.models.length > 0) {
      setSelectedModelId(cat.models[0].id);
    }
  };

  const processFile = (
    file: File, 
    setImage: React.Dispatch<React.SetStateAction<ImageInput | null>>,
    setWarning: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];

      // Check Aspect Ratio (16:9 is approx 1.77)
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        // Tolerance approx +/- 0.02 (e.g., 1.75 to 1.80 is considered safe)
        const is16_9 = ratio > 1.75 && ratio < 1.80;
        setWarning(!is16_9);

        setImage({
          base64: base64Data,
          mimeType: file.type
        });
      };
      img.src = base64String;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setImage: React.Dispatch<React.SetStateAction<ImageInput | null>>,
    setWarning: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, setImage, setWarning);
    }
  };

  const handleSwapImages = () => {
    const tempImage = startImage;
    const tempWarning = startImageWarning;
    
    setStartImage(endImage);
    setStartImageWarning(endImageWarning);
    
    setEndImage(tempImage);
    setEndImageWarning(tempWarning);
  };

  const handleNewScene = () => {
    setInputText('');
    setStartImage(null);
    setEndImage(null);
    setStartImageWarning(false);
    setEndImageWarning(false);
    setResult(null);
    setError(null);
    if (startFileInputRef.current) startFileInputRef.current.value = '';
    if (endFileInputRef.current) endFileInputRef.current.value = '';
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("Cancellare tutta la cronologia?")) {
        setHistory([]);
    }
  };

  const onDragOver = (e: React.DragEvent, setDragging: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent, setDragging: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const onDrop = (
    e: React.DragEvent, 
    setDragging: (v: boolean) => void, 
    setImage: React.Dispatch<React.SetStateAction<ImageInput | null>>,
    setWarning: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file, setImage, setWarning);
    }
  };

  const handleGenerate = async () => {
    if (!inputText && !startImage && !endImage) return;

    let finalModelName = selectedModelDef?.name || 'Unknown Model';
    if (selectedCategoryId === 'custom') {
      if (!customModelName.trim()) {
        setError("Inserisci il nome del modello personalizzato.");
        return;
      }
      finalModelName = customModelName;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const optimized = await generateVideoPrompt(
        inputText,
        finalModelName,
        startImage || undefined,
        endImage || undefined,
        { isShortPrompt, includeTechParams, fixColorShift, isHighFidelity }
      );
      
      setResult(optimized);
      
      const newHistoryItem: HistoryItem = {
        ...optimized,
        id: Date.now().toString(),
        originalInput: inputText || '(Image Analysis)',
        timestamp: Date.now(),
        model: finalModelName
      };
      // Keep last 20 items for history
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 20)); 

    } catch (err: any) {
      setError(err.message || "Si è verificato un errore durante la generazione.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start h-full">
      
      {/* LEFT COLUMN: Inputs & Config (Compact) */}
      <div className="xl:col-span-5 flex flex-col gap-4">
        
        {/* 1. Model Configuration Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            
            {/* Category Tabs (Horizontal Scroll) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 custom-scrollbar">
                {MODEL_CATALOG.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                            ${selectedCategoryId === cat.id 
                                ? 'bg-indigo-600 text-white shadow-indigo-500/20 shadow-md' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Models Grid (Compact) */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {selectedCategory?.models.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className={`text-left px-3 py-2 rounded-lg text-xs border transition-all truncate
                            ${selectedModelId === model.id
                                ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-200'
                                : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        title={model.description}
                    >
                        <div className="font-semibold truncate">{model.name}</div>
                        <div className="text-[10px] opacity-60 truncate">{model.description}</div>
                    </button>
                ))}
                {selectedCategoryId === 'custom' && (
                     <input
                        type="text"
                        value={customModelName}
                        onChange={(e) => setCustomModelName(e.target.value)}
                        placeholder="Nome Modello..."
                        className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                )}
            </div>

            {/* Options Row */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
                {/* Short Prompt Option */}
                <button 
                    onClick={() => setIsShortPrompt(!isShortPrompt)}
                    title="Genera un prompt conciso e diretto (20-40 parole), focalizzato sull'azione principale. Ideale per test rapidi."
                    className={`flex items-center gap-2 text-xs transition-colors ${isShortPrompt ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}
                >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${isShortPrompt ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                        {isShortPrompt && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    Prompt Breve
                </button>

                {/* Tech Params Option */}
                <button 
                    onClick={() => setIncludeTechParams(!includeTechParams)}
                    title="Include specifiche tecniche di ripresa (es. 'Shot on Arri Alexa', 'Anamorphic lens', 'Cinematic lighting') per aumentare il realismo."
                    className={`flex items-center gap-2 text-xs transition-colors ${includeTechParams ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}
                >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${includeTechParams ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                         {includeTechParams && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    Tech Params
                </button>

                {/* Fix Color Shift Option */}
                <button 
                    onClick={() => setFixColorShift(!fixColorShift)}
                    title="Aggiunge istruzioni rigorose per mantenere l'esposizione, il contrasto e i colori dell'immagine originale (utile per Image-to-Video)."
                    className={`flex items-center gap-2 text-xs transition-colors ${fixColorShift ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}
                >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${fixColorShift ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                        {fixColorShift && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    Fix Color Shift
                </button>

                {/* High Fidelity Option */}
                <button 
                    onClick={() => setIsHighFidelity(!isHighFidelity)}
                    title="Attivo: Segue fedelmente la tua descrizione. Disattivato: L'AI ha più libertà creativa per inventare dettagli e migliorare la scena."
                    className={`flex items-center gap-2 text-xs transition-colors ${isHighFidelity ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}
                >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${isHighFidelity ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                        {isHighFidelity && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    Segui Input Fedelmente
                </button>
            </div>
        </div>

        {/* 2. Text Input */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-md">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Descrivi la scena, il movimento e l'atmosfera..."
                className="w-full h-32 bg-transparent border-none p-4 text-slate-200 placeholder-slate-600 focus:ring-0 outline-none resize-none text-base font-light leading-relaxed"
            />
        </div>

        {/* 3. Images (Compact Row) */}
        <div className="relative group">
            <div className="grid grid-cols-2 gap-4">
                {/* Start Frame */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase">Start Frame <span className="text-slate-500 font-normal lowercase ml-1">(facoltativo)</span></label>
                        {startImage && <button onClick={() => { setStartImage(null); setStartImageWarning(false); if(startFileInputRef.current) startFileInputRef.current.value = ''; }} className="text-[10px] text-red-400 hover:text-red-300">Rimuovi</button>}
                    </div>
                    {!startImage ? (
                        <div 
                            onClick={() => startFileInputRef.current?.click()}
                            onDragOver={(e) => onDragOver(e, setIsDraggingStart)}
                            onDragLeave={(e) => onDragLeave(e, setIsDraggingStart)}
                            onDrop={(e) => onDrop(e, setIsDraggingStart, setStartImage, setStartImageWarning)}
                            className={`aspect-video w-full border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all
                                ${isDraggingStart ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800'}`}
                        >
                            <PhotoIcon className="w-8 h-8 text-slate-600" />
                            <span className="text-[10px] text-slate-500 mt-1">First Frame</span>
                            <input type="file" ref={startFileInputRef} onChange={(e) => handleImageUpload(e, setStartImage, setStartImageWarning)} accept="image/*" className="hidden" />
                        </div>
                    ) : (
                        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-700 group/image">
                            <img src={`data:${startImage.mimeType};base64,${startImage.base64}`} className="w-full h-full object-contain" />
                            {startImageWarning && (
                                <div className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-950 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-20">
                                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">Non 16:9</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* End Frame */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-pink-400 uppercase">End Frame <span className="text-slate-500 font-normal lowercase ml-1">(facoltativo)</span></label>
                        {endImage && <button onClick={() => { setEndImage(null); setEndImageWarning(false); if(endFileInputRef.current) endFileInputRef.current.value = ''; }} className="text-[10px] text-red-400 hover:text-red-300">Rimuovi</button>}
                    </div>
                    {!endImage ? (
                        <div 
                            onClick={() => endFileInputRef.current?.click()}
                            onDragOver={(e) => onDragOver(e, setIsDraggingEnd)}
                            onDragLeave={(e) => onDragLeave(e, setIsDraggingEnd)}
                            onDrop={(e) => onDrop(e, setIsDraggingEnd, setEndImage, setEndImageWarning)}
                            className={`aspect-video w-full border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all
                                ${isDraggingEnd ? 'border-pink-400 bg-pink-500/10' : 'border-slate-700 hover:border-pink-500/50 hover:bg-slate-800'}`}
                        >
                            <PhotoIcon className="w-8 h-8 text-slate-600" />
                            <span className="text-[10px] text-slate-500 mt-1">Last Frame</span>
                            <input type="file" ref={endFileInputRef} onChange={(e) => handleImageUpload(e, setEndImage, setEndImageWarning)} accept="image/*" className="hidden" />
                        </div>
                    ) : (
                        <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-700 group/image">
                            <img src={`data:${endImage.mimeType};base64,${endImage.base64}`} className="w-full h-full object-contain" />
                            {endImageWarning && (
                                <div className="absolute top-2 right-2 bg-yellow-500/90 text-yellow-950 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-20">
                                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">Non 16:9</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Swap Button */}
            {(startImage || endImage) && (
                <button 
                    onClick={handleSwapImages}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 p-2 rounded-full shadow-xl hover:bg-indigo-600 hover:border-indigo-500 text-slate-400 hover:text-white transition-all z-10"
                    title="Inverti Immagini"
                >
                    <ArrowsRightLeftIcon className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* 4. Action Buttons */}
        <div className="flex gap-3">
             {/* New Scene Button */}
             <button
                onClick={handleNewScene}
                className="px-4 rounded-xl font-bold text-slate-400 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-[0.98]"
                title="Nuova Scena (Cancella tutto)"
            >
                <PlusIcon className="w-6 h-6" />
            </button>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isLoading || (!inputText && !startImage && !endImage)}
                className={`flex-grow py-4 rounded-xl font-bold text-lg text-white shadow-xl flex items-center justify-center gap-2 transition-all
                    ${isLoading || (!inputText && !startImage && !endImage)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.99]'
                    }`}
            >
                {isLoading ? (
                    <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Generazione...</span>
                    </>
                ) : (
                    <>
                    <SparklesIcon className="w-5 h-5" />
                    <span>OTTIMIZZA PROMPT</span>
                    </>
                )}
            </button>
        </div>

        {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-300 text-xs">
                {error}
            </div>
        )}

      </div>

      {/* RIGHT COLUMN: Output (Prominent) */}
      <div className="xl:col-span-7 flex flex-col gap-4 h-full overflow-hidden">
        
        {/* Main Result Card */}
        <div className="flex-shrink-0 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col">
            
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none -ml-32 -mb-32"></div>

            {!result ? (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-600 opacity-40">
                    <VideoCameraIcon className="w-24 h-24 mb-4 stroke-1" />
                    <p className="text-xl font-light">L'output ottimizzato apparirà qui</p>
                    <p className="text-sm mt-2">Pronto per essere copiato e incollato</p>
                </div>
            ) : (
                <div className="relative z-10 flex flex-col h-full animate-fade-in-up">
                    
                    {/* Header Output */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-xs font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 px-2 py-0.5 rounded">
                                    {selectedCategoryId === 'custom' ? customModelName : selectedModelDef?.name}
                                </span>
                                {result.usedOptions.includeTechParams && <span className="text-[10px] text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full">TECH PARAMS</span>}
                                {result.usedOptions.fixColorShift && <span className="text-[10px] text-pink-400 border border-pink-900/30 px-2 py-0.5 rounded-full">COLOR FIX</span>}
                                {result.usedOptions.isHighFidelity && <span className="text-[10px] text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded-full">STRICT</span>}
                                <span className="text-[10px] text-green-500/80 flex items-center gap-1">
                                    <GlobeAltIcon className="w-3 h-3" /> Grounded
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Prompt Finale</h2>
                        </div>
                        <button 
                            onClick={() => copyToClipboard(result.mainPrompt)}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all shadow-lg border border-slate-700 hover:border-indigo-500"
                        >
                            <ClipboardDocumentIcon className="w-5 h-5" />
                            <span className="text-sm font-semibold">Copia</span>
                        </button>
                    </div>

                    {/* The Prompt */}
                    <div className="bg-black/40 rounded-xl p-6 border border-slate-800 mb-6 relative group overflow-y-auto max-h-[250px] custom-scrollbar">
                        <p className="text-slate-50 font-sans text-xl leading-relaxed tracking-wide selection:bg-indigo-500/40">
                            {result.mainPrompt}
                        </p>
                    </div>

                    {/* Metadata Grid - Analysis Only */}
                    <div className="mt-auto">
                        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800/50">
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <AdjustmentsHorizontalIcon className="w-3 h-3" /> Analisi AI
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-default">
                                {result.reasoning}
                            </p>
                        </div>
                    </div>

                </div>
            )}
        </div>

        {/* History Column (Vertical) */}
        {history.length > 0 && (
            <div className="flex-grow min-h-0 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between text-slate-500 mb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Cronologia Recente</span>
                    </div>
                    <button onClick={clearHistory} className="text-slate-600 hover:text-red-400 transition-colors" title="Cancella Cronologia">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Vertical Scroll List */}
                <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                    {history.map((item) => (
                        <div 
                            key={item.id} 
                            onClick={() => setResult(item)}
                            className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 rounded-lg p-4 cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/20 px-1.5 py-0.5 rounded">{item.model}</span>
                                <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">
                                    {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    <span className="mx-1">•</span>
                                    {new Date(item.timestamp).toLocaleDateString([], {day:'2-digit', month:'2-digit'})}
                                </span>
                            </div>
                            <p className="text-slate-300 text-sm line-clamp-2 leading-snug group-hover:text-white transition-colors">
                                {item.mainPrompt}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default PromptBuilder;