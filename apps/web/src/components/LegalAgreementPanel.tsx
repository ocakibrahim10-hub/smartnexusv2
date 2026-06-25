'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, X } from 'lucide-react';
import {
  documentsForContext,
  LEGAL_DOCUMENT_VERSION,
  type LegalDocumentDef,
  type LegalDocumentId,
} from '@/lib/legal-documents';

type Context = 'dealer_business' | 'subscription_checkout';

type Props = {
  context: Context;
  onChange: (accepted: boolean, documentIds: LegalDocumentId[]) => void;
  className?: string;
};

export default function LegalAgreementPanel({ context, onChange, className = '' }: Props) {
  const docs = useMemo(() => documentsForContext(context), [context]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [viewDoc, setViewDoc] = useState<LegalDocumentDef | null>(null);

  const allAccepted = docs.every((d) => checked[d.id]);

  useEffect(() => {
    onChange(
      allAccepted,
      docs.filter((d) => checked[d.id]).map((d) => d.id),
    );
  }, [allAccepted, checked, docs, onChange]);

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <FileText size={16} className="text-[#606BDF]" />
        Yasal metinler ve onay
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        Devam etmek için aşağıdaki sözleşmeleri okuyup kabul etmeniz gerekir. Onaylarınız denetim
        amacıyla kayıt altına alınır (KVKK m.5).
      </p>
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li key={doc.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              id={`legal-${doc.id}`}
              checked={!!checked[doc.id]}
              onChange={() => toggle(doc.id)}
              className="mt-1"
            />
            <label htmlFor={`legal-${doc.id}`} className="text-gray-700 leading-snug">
              <button
                type="button"
                onClick={() => setViewDoc(doc)}
                className="text-[#606BDF] font-medium hover:underline"
              >
                {doc.shortLabel}
              </button>
              {' '}metnini okudum, anladım ve kabul ediyorum.
              {doc.id === 'ANTIRESELL' && (
                <span className="block text-xs text-amber-700 mt-0.5">
                  Alt bayi satışı ve lisans suistimali halinde cezai şartlar geçerlidir.
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>

      {viewDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div
            className="modal-card w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
              <div>
                <h3 className="text-gray-900 font-semibold">{viewDoc.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Sürüm: {LEGAL_DOCUMENT_VERSION}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewDoc(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-gray-100 pt-4">
              {viewDoc.content}
            </div>
            <button
              type="button"
              className="btn-primary w-full mt-4 shrink-0"
              onClick={() => {
                setChecked((prev) => ({ ...prev, [viewDoc.id]: true }));
                setViewDoc(null);
              }}
            >
              Okudum, kabul ediyorum
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
