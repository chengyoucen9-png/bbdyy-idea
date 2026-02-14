import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
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
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/materials" />} />
                      <Route path="/materials" element={<MaterialsPage />} />
                      <Route path="/topics" element={<TopicsPage />} />
                      <Route path="/videos" element={<VideosPage />} />
                    </Routes>
                  </DashboardLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
