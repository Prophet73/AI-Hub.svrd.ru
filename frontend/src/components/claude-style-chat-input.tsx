import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ArrowUp, Check } from "lucide-react";

/* --- COMPONENTS --- */

// Model Selector
interface Model {
    id: string;
    name: string;
    description: string;
}

interface ModelSelectorProps {
    models: Model[];
    selectedModel: string;
    onSelect: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModel, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentModel = models.find(m => m.id === selectedModel) || models[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center justify-center relative shrink-0 transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 rounded-xl px-3 min-w-[4rem] active:scale-[0.98] whitespace-nowrap text-xs pl-2.5 pr-2 gap-1
                ${isOpen
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
                <div className="font-ui inline-flex gap-[3px] text-[14px] h-[14px] leading-none items-baseline">
                    <div className="flex items-center gap-[4px]">
                        <div className="whitespace-nowrap select-none font-medium">{currentModel?.name || 'Выберите модель'}</div>
                    </div>
                </div>
                <div className="flex items-center justify-center opacity-75" style={{ width: '20px', height: '20px' }}>
                    <ChevronDown className={`shrink-0 opacity-75 transition-transform duration-200 w-4 h-4 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-[280px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col p-1.5 animate-fade-in origin-bottom-right">
                    {models.map(model => (
                        <button
                            key={model.id}
                            onClick={() => {
                                onSelect(model.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start justify-between group transition-colors hover:bg-gray-50`}
                        >
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold text-gray-900">
                                        {model.name}
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-500">
                                    {model.description}
                                </span>
                            </div>
                            {selectedModel === model.id && (
                                <Check className="w-4 h-4 text-[#E52713] mt-1" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Main Chat Input Component
interface ClaudeChatInputProps {
    onSendMessage: (data: {
        message: string;
        model: string;
    }) => void;
    models?: Model[];
    defaultModel?: string;
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

const DEFAULT_MODELS: Model[] = [
    { id: "gemini-2.5-flash-lite", name: "2.5 Flash Lite", description: "Лёгкая экономичная модель" },
    { id: "gemini-2.5-flash", name: "2.5 Flash", description: "Оптимизированная по скорости модель" },
    { id: "gemini-2.5-pro", name: "2.5 Pro", description: "Продвинутая модель с расширенными возможностями" },
    { id: "gemini-3-flash-preview", name: "3 Flash", description: "Быстрая модель для повседневных задач" },
    { id: "gemini-3-pro-preview", name: "3 Pro", description: "Мощная модель для сложных задач" },
];

export const ClaudeChatInput: React.FC<ClaudeChatInputProps> = ({
    onSendMessage,
    models,
    defaultModel,
    selectedModel: externalSelectedModel,
    onModelChange,
    disabled = false,
    placeholder = "Чем могу помочь?"
}) => {
    const actualModels = models && models.length > 0 ? models : DEFAULT_MODELS;
    const actualDefaultModel = defaultModel || actualModels[0]?.id || "gemini-3-flash-preview";

    const [message, setMessage] = useState("");
    const [internalSelectedModel, setInternalSelectedModel] = useState(actualDefaultModel);

    // Update selected model when defaultModel changes
    useEffect(() => {
        if (defaultModel) {
            setInternalSelectedModel(defaultModel);
        }
    }, [defaultModel]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const selectedModel = externalSelectedModel || internalSelectedModel;

    const handleModelSelect = (modelId: string) => {
        if (onModelChange) {
            onModelChange(modelId);
        } else {
            setInternalSelectedModel(modelId);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 384) + "px";
        }
    }, [message]);

    const handleSend = () => {
        if (!message.trim() || disabled) return;
        onSendMessage({ message, model: selectedModel });
        setMessage("");
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const hasContent = message.trim().length > 0;

    return (
        <div className="relative w-full max-w-3xl mx-auto">
            {/* Main Container */}
            <div className={`
                flex flex-col items-stretch transition-all duration-200 relative z-10 rounded-2xl cursor-text border border-gray-200
                shadow-[0_0_15px_rgba(0,0,0,0.06)] hover:shadow-[0_0_20px_rgba(0,0,0,0.1)]
                focus-within:shadow-[0_0_25px_rgba(0,0,0,0.12)] focus-within:border-gray-300
                bg-white
                ${disabled ? 'opacity-60 pointer-events-none' : ''}
            `}>

                <div className="flex flex-col px-4 pt-3 pb-2 gap-2">
                    {/* Input Area */}
                    <div className="relative">
                        <div className="max-h-96 w-full overflow-y-auto break-words transition-opacity duration-200 min-h-[2.5rem]">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                disabled={disabled}
                                className="w-full bg-transparent border-0 outline-none text-gray-900 text-[16px] placeholder:text-gray-400 resize-none overflow-hidden py-0 leading-relaxed block font-normal"
                                rows={1}
                                style={{ minHeight: '1.5em' }}
                            />
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-2 w-full items-center justify-between">
                        {/* Left - empty for now */}
                        <div className="flex-1" />

                        {/* Right Tools */}
                        <div className="flex flex-row items-center gap-2">
                            {/* Model Selector */}
                            <ModelSelector
                                models={actualModels}
                                selectedModel={selectedModel}
                                onSelect={handleModelSelect}
                            />

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={!hasContent || disabled}
                                className={`
                                    inline-flex items-center justify-center relative shrink-0 transition-colors h-8 w-8 rounded-xl active:scale-95
                                    ${hasContent && !disabled
                                        ? 'bg-[#E52713] text-white hover:bg-[#C91F0F] shadow-md'
                                        : 'bg-gray-200 text-gray-400 cursor-default'}
                                `}
                                type="button"
                                aria-label="Отправить сообщение"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hint */}
            <div className="flex justify-center mt-3 gap-4">
                <span className="text-xs text-gray-400">Enter - отправить</span>
                <span className="text-xs text-gray-400">Shift+Enter - новая строка</span>
            </div>
        </div>
    );
};

export default ClaudeChatInput;
