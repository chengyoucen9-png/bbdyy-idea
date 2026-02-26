import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UploadTask {
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface UploadContextType {
  uploadTasks: UploadTask[];
  setUploadTasks: (tasks: UploadTask[]) => void;
  uploadProgress: { done: number; total: number } | null;
  setUploadProgress: (progress: { done: number; total: number } | null) => void;
  uploadRunning: boolean;
  setUploadRunning: (running: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadRunning, setUploadRunning] = useState(false);

  // 初始化：从 localStorage 恢复上传状态
  useEffect(() => {
    const stored = localStorage.getItem('material_upload_state');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        setUploadTasks(state.uploadTasks || []);
        setUploadProgress(state.uploadProgress);
        setUploadRunning(state.uploadRunning);
      } catch (e) {
        console.error('Failed to restore upload state:', e);
      }
    }
  }, []);

  // 持久化上传状态到 localStorage
  useEffect(() => {
    const state = { uploadTasks, uploadProgress, uploadRunning };
    localStorage.setItem('material_upload_state', JSON.stringify(state));
  }, [uploadTasks, uploadProgress, uploadRunning]);

  return (
    <UploadContext.Provider value={{ uploadTasks, setUploadTasks, uploadProgress, setUploadProgress, uploadRunning, setUploadRunning }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadContext() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploadContext must be used within UploadProvider');
  }
  return context;
}
