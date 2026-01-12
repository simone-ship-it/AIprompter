import React, { useState, useRef } from 'react';
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
  ClockIcon
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
  
  // Image State (Start & End Frames)
  const [startImage, setStartImage] = useState<ImageInput | null>(null);
  const [endImage, setEndImage] = useState<ImageInput | null>(null);

  // Drag State
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizedPrompt | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const startFileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = MODEL_CATALOG.find(c => c.id === selectedCategoryId);
  const selectedModelDef = selectedCategory?.models.find(m => m.id === selectedModelId);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = MODEL_CATALOG.find(c => c.id === catId);
    if (cat && cat.models.length > 0) {
      setSelectedModelId(cat.models[0].id);
    }
  };

  const processFile = (file: File, setImage: React.Dispatch<React.SetStateAction<ImageInput | null>>) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setImage({
        base64: base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setImage: React.Dispatch<React.SetStateAction<ImageInput | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, setImage);
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
    setImage: React.Dispatch<React.SetStateAction<ImageInput | null>>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file, setImage);
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
        { isShortPrompt, includeTechParams }
      );
      
      setResult(optimized);
      
      const newHistoryItem: HistoryItem = {
        ...optimized,
        id: Date.now().toString(),
        originalInput: inputText || '(Image Analysis)',
        timestamp: Date.now(),
        model: finalModelName
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 8)); 

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
            <div className="flex items-center gap-4 pt-3 border-t border-slate-800">
                <button 
                    onClick={() => setIsShortPrompt(!isShortPrompt)}
                    className={`flex items-center gap-2 text-xs transition-colors ${isShortPrompt ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}
                >
                    <div className={`w-3 h-3 rounded-sm border ${isShortPrompt ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}></div>
                    Prompt Breve (Veo/Kling)
                </button>
                <button 
                    onClick={() => setIncludeTechParams(!includeTechParams)}
                    className={`flex items-center gap-2 text-xs transition-colors ${includeTechParams ? 'text-indigo-400 font-medium' : 'text-slate-500'}`}
                >
                    <div className={`w-3 h-3 rounded-sm border ${includeTechParams ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}></div>
                    Parametri Tecnici
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
        <div className="grid grid-cols-2 gap-4">
             {/* Start Frame */}
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Start Frame</label>
                    {startImage && <button onClick={() => { setStartImage(null); if(startFileInputRef.current) startFileInputRef.current.value = ''; }} className="text-[10px] text-red-400 hover:text-red-300">Rimuovi</button>}
                </div>
                {!startImage ? (
                    <div 
                        onClick={() => startFileInputRef.current?.click()}
                        onDragOver={(e) => onDragOver(e, setIsDraggingStart)}
                        onDragLeave={(e) => onDragLeave(e, setIsDraggingStart)}
                        onDrop={(e) => onDrop(e, setIsDraggingStart, setStartImage)}
                        className={`aspect-video w-full border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all h-24
                            ${isDraggingStart ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800'}`}
                    >
                        <PhotoIcon className="w-5 h-5 text-slate-600" />
                        <span className="text-[10px] text-slate-500 mt-1">First Frame</span>
                        <input type="file" ref={startFileInputRef} onChange={(e) => handleImageUpload(e, setStartImage)} accept="image/*" className="hidden" />
                    </div>
                ) : (
                    <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-700 h-24">
                        <img src={`data:${startImage.mimeType};base64,${startImage.base64}`} className="w-full h-full object-contain" />
                    </div>
                )}
            </div>

            {/* End Frame */}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-pink-400 uppercase">End Frame</label>
                    {endImage && <button onClick={() => { setEndImage(null); if(endFileInputRef.current) endFileInputRef.current.value = ''; }} className="text-[10px] text-red-400 hover:text-red-300">Rimuovi</button>}
                </div>
                {!endImage ? (
                    <div 
                        onClick={() => endFileInputRef.current?.click()}
                        onDragOver={(e) => onDragOver(e, setIsDraggingEnd)}
                        onDragLeave={(e) => onDragLeave(e, setIsDraggingEnd)}
                        onDrop={(e) => onDrop(e, setIsDraggingEnd, setEndImage)}
                        className={`aspect-video w-full border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all h-24
                            ${isDraggingEnd ? 'border-pink-400 bg-pink-500/10' : 'border-slate-700 hover:border-pink-500/50 hover:bg-slate-800'}`}
                    >
                        <PhotoIcon className="w-5 h-5 text-slate-600" />
                        <span className="text-[10px] text-slate-500 mt-1">Last Frame</span>
                        <input type="file" ref={endFileInputRef} onChange={(e) => handleImageUpload(e, setEndImage)} accept="image/*" className="hidden" />
                    </div>
                ) : (
                    <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-slate-700 h-24">
                        <img src={`data:${endImage.mimeType};base64,${endImage.base64}`} className="w-full h-full object-contain" />
                    </div>
                )}
            </div>
        </div>

        {/* 4. Generate Button */}
        <button
            onClick={handleGenerate}
            disabled={isLoading || (!inputText && !startImage && !endImage)}
            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl flex items-center justify-center gap-2 transition-all
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

        {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-300 text-xs">
                {error}
            </div>
        )}

      </div>

      {/* RIGHT COLUMN: Output (Prominent) */}
      <div className="xl:col-span-7 flex flex-col gap-4 h-full">
        
        {/* Main Result Card */}
        <div className="flex-grow bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
            
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
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-xs font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 px-2 py-0.5 rounded">
                                    {selectedCategoryId === 'custom' ? customModelName : selectedModelDef?.name}
                                </span>
                                {includeTechParams && <span className="text-[10px] text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full">TECH PARAMS</span>}
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
                    <div className="bg-black/40 rounded-xl p-8 border border-slate-800 mb-8 relative group">
                        <p className="text-slate-50 font-sans text-xl md:text-2xl leading-relaxed tracking-wide selection:bg-indigo-500/40">
                            {result.mainPrompt}
                        </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-auto">
                        <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-800/50">
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <AdjustmentsHorizontalIcon className="w-3 h-3" /> Analisi AI
                            </h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {result.reasoning}
                            </p>
                        </div>
                        <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-800/50">
                            <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" /> Settings
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-[10px] text-slate-500">Risoluzione</span>
                                    <span className="text-sm font-mono text-white">{result.suggestedSettings.resolution}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500">FPS</span>
                                    <span className="text-sm font-mono text-white">{result.suggestedSettings.fps}</span>
                                </div>
                                {result.suggestedSettings.motionScale && (
                                    <div className="col-span-2">
                                        <span className="block text-[10px] text-slate-500">Motion Scale</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-grow h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${(result.suggestedSettings.motionScale / 10) * 100}%` }}></div>
                                            </div>
                                            <span className="text-xs font-mono text-white">{result.suggestedSettings.motionScale}/10</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>

        {/* History Row (Compact below result) */}
        {history.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Cronologia Recente</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {history.map((item) => (
                        <div 
                            key={item.id} 
                            onClick={() => setResult(item)}
                            className="min-w-[200px] max-w-[200px] bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 rounded-lg p-3 cursor-pointer transition-all flex-shrink-0"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-indigo-300 bg-indigo-900/20 px-1.5 rounded">{item.model}</span>
                                <span className="text-[10px] text-slate-600">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-slate-400 text-xs line-clamp-2">{item.mainPrompt}</p>
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