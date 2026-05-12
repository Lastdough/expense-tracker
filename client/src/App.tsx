import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './shell/Layout';
import QuickAddPlaceholder from './routes/QuickAddPlaceholder';
import ExpensesPlaceholder from './routes/ExpensesPlaceholder';
import DashboardPlaceholder from './routes/DashboardPlaceholder';
import ReceiptPlaceholder from './routes/ReceiptPlaceholder';
import SettingsPage from './routes/settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/settings" replace />} />
        <Route path="quick-add" element={<QuickAddPlaceholder />} />
        <Route path="expenses" element={<ExpensesPlaceholder />} />
        <Route path="dashboard" element={<DashboardPlaceholder />} />
        <Route path="receipt" element={<ReceiptPlaceholder />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  );
}
