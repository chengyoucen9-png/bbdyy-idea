import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/auth';
import { UploadProvider } from './context/UploadContext';
import { authAPI } from './api/client';
import LoginPage from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import MaterialsPage from './pages/Materials';
import TopicsPage from './pages/Topics';
import VideosPage from './pages/Videos';
import HomePage from './pages/Home';
import AiConfigPage from './pages/AiConfig';
import UsersPage from './pages/Users';
import CrawlerPage from './pages/Crawler';
import CrawlerSyncPage from './pages/CrawlerSync';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppInit() {
  const { isAuthenticated, user, setUser } = useAuthStore();
  useEffect(() => {
    if (isAuthenticated && !user) {
      authAPI.getProfile().then((profile: any) => setUser(profile)).catch(() => {});
    }
  }, [isAuthenticated, user, setUser]);
  return null;
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <UploadProvider>
          <BrowserRouter>
            <AppInit />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <DashboardLayout>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/materials/bbdyy" element={<MaterialsPage />} />
                        <Route path="/materials/talent" element={<MaterialsPage />} />
                        <Route path="/topics" element={<TopicsPage />} />
                        <Route path="/videos" element={<VideosPage />} />
                        <Route path="/ai-config" element={<AiConfigPage />} />
                        <Route path="/crawler/tasks" element={<CrawlerPage />} />
                        <Route path="/crawler/results" element={<CrawlerPage />} />
                        <Route path="/crawler/sync" element={<CrawlerSyncPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/materials" element={<Navigate to="/materials/bbdyy" replace />} />
                        <Route path="/crawler" element={<Navigate to="/crawler/tasks" replace />} />
                      </Routes>
                    </DashboardLayout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </UploadProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
