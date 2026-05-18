import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './shell/Layout';
import QuickAdd from './routes/QuickAdd';
import Expenses from './routes/Expenses';
import ExpenseDetail from './routes/ExpenseDetail';
import Dashboard from './routes/Dashboard';
import Receipt from './routes/Receipt';
import ImportPage from './routes/Import';
import SettingsPage from './routes/settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/quick-add" replace />} />
        <Route path="quick-add" element={<QuickAdd />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expenses/:id" element={<ExpenseDetail />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="receipt" element={<Receipt />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/quick-add" replace />} />
      </Route>
    </Routes>
  );
}
