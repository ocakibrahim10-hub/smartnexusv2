/* eslint-disable jsx-a11y/control-has-associated-label, jsx-a11y/heading-has-content, jsx-a11y/alt-text, jsx-a11y/anchor-has-content, jsx-a11y/label-has-associated-control */
"use client";

import React, { useState, useEffect } from 'react';
import { X, Lightbulb, CheckCircle2 } from 'lucide-react';

interface ModuleGuideProps {
  moduleKey: string;
  title: string;
  description: string;
  features: string[];
}

export function ModuleGuide({ moduleKey, title, description, features }: ModuleGuideProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(`module_guide_${moduleKey}`);
    if (!isDismissed) {
      setShow(true);
    }
  }, [moduleKey]);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(`module_guide_${moduleKey}`, 'true');
    setShow(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white relative">
          <button title="Ä°ÅŸlem" aria-label="Ä°ÅŸlem" 
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          
          <h2 className="text-xl font-bold mb-1">HoÅŸ Geldiniz: {title}</h2>
          <p className="text-indigo-100 text-sm leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">Bu ModÃ¼lde Neler Yapabilirsiniz?</h3>
          <ul className="space-y-3 mb-6">
            {features.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <span className="text-gray-600 text-sm leading-relaxed">{feat}</span>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={dismiss}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm"
          >
            AnladÄ±m, BaÅŸlayalÄ±m
          </button>
        </div>
      </div>
    </div>
  );
}

