
import React, { useState } from 'react';
import { StoredResult, FeatureType } from '../types';
import { Card, Button } from './Shared';

interface Props {
  results: StoredResult[];
  activeType?: FeatureType;
  onDelete: (id: string) => void;
  onCopy: (content: string) => void;
  onDownload: (result: StoredResult) => void;
}

const PersistentResults: React.FC<Props> = ({ results, activeType, onDelete, onCopy, onDownload }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter results by feature type if provided
  const filteredResults = activeType 
    ? results.filter(r => r.type === activeType) 
    : results;

  if (filteredResults.length === 0) return null;

  return (
    <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>🕒</span> Recent {activeType ? 'Results' : 'Activity'}
        </h3>
        <span className="text-sm text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">
          {filteredResults.length} entries stored locally
        </span>
      </div>

      <div className="space-y-4">
        {filteredResults.map((result) => (
          <Card key={result.id} className="border border-gray-100 hover:border-indigo-200 transition-all shadow-sm">
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">
                    {result.type === 'transcribe' ? '🎙️' : 
                     result.type === 'translate' ? '🌐' : 
                     result.type === 'video-generator' ? '🎥' : 
                     result.type === 'srt-translate' ? '🎞️' : '📝'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{result.title}</h4>
                    <p className="text-xs text-gray-400 font-medium">
                      {new Date(result.timestamp).toLocaleString()} • <span className="uppercase text-[10px] tracking-widest text-indigo-500">{result.type.replace('-', ' ')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => onCopy(result.content)} className="text-sm px-3 py-1.5 h-9">
                    📋 Copy
                  </Button>
                  <Button variant="secondary" onClick={() => onDownload(result)} className="text-sm px-3 py-1.5 h-9">
                    💾 Save
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setExpandedId(expandedId === result.id ? null : result.id)} 
                    className="text-sm px-3 py-1.5 h-9"
                  >
                    {expandedId === result.id ? '🔼 Hide' : '🔽 View'}
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => {
                      if(confirm('Are you sure you want to delete this result?')) {
                        onDelete(result.id);
                      }
                    }} 
                    className="text-sm px-3 py-1.5 h-9 bg-red-50 text-red-600 hover:bg-red-100 shadow-none border-0"
                  >
                    🗑️
                  </Button>
                </div>
              </div>

              {expandedId === result.id && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 overflow-auto max-h-[300px] text-sm text-gray-600 whitespace-pre-wrap leading-relaxed animate-in slide-in-from-top-2 duration-300">
                  {result.content}
                </div>
              )}
              
              {expandedId !== result.id && (
                <p className="text-sm text-gray-500 line-clamp-2 italic px-2">
                  {result.content.substring(0, 150)}...
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PersistentResults;
