import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/Login';
import ModernLayout from './components/ModernLayout';
import AIHomePage from './pages/AIHome';
import MaterialsPage from './pages/Materials';
import TopicsPage from './pages/Topics';
import VideosPage from './pages/Videos';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <PrivateRoute>
                <ModernLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/ai-home" />} />
                    <Route path="/ai-home" element={<AIHomePage />} />
                    <Route path="/materials" element={<MaterialsPage />} />
                    <Route path="/topics" element={<TopicsPage />} />
                    <Route path="/videos" element={<VideosPage />} />
                    <Route path="/analytics" element={<div style={{padding: 40, textAlign: 'center'}}>📊 数据分析功能开发中...</div>} />
                  </Routes>
                </ModernLayout>
              </PrivateRoute>
            } />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
