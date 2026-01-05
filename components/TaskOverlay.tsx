
import React from 'react';
import { ProcessingTask } from '../types';
import { Card, ProgressBar, Button } from './Shared';

interface Props {
  tasks: ProcessingTask[];
  onDismiss: (id: string) => void;
  onRetry: (id: string) => void;
}

const TaskOverlay: React.FC<Props> = ({ tasks, onDismiss, onRetry }) => {
  const activeTasks = tasks.filter(t => t.status !== 'completed' || Date.now() - t.timestamp < 10000);
  
  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-80 space-y-3 pointer-events-none">
      {activeTasks.map((task) => (
        <Card key={task.id} className="pointer-events-auto p-4 shadow-2xl border-indigo-100 animate-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {task.status === 'failed' ? '❌' : 
                 task.status === 'completed' ? '✅' : 
                 task.status === 'uploading' ? '📤' : '⚙️'}
              </span>
              <h4 className="text-xs font-bold text-gray-900 truncate max-w-[160px]">{task.title}</h4>
            </div>
            <button onClick={() => onDismiss(task.id)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          <ProgressBar 
            progress={task.progress} 
            label={task.status.replace('_', ' ')} 
            color={task.status === 'failed' ? 'bg-red-500' : task.status === 'completed' ? 'bg-green-500' : 'bg-indigo-600'}
          />

          {task.status === 'failed' && (
             <div className="mt-3 flex items-center gap-2">
               <p className="text-[10px] text-red-500 flex-grow truncate">{task.error}</p>
               <Button onClick={() => onRetry(task.id)} className="text-[10px] px-2 py-1 h-6 min-w-0" variant="secondary">Retry</Button>
             </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default TaskOverlay;
