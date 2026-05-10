import { Wallet } from 'lucide-react';

export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
      <div className="flex flex-col items-center gap-4 p-8">
        <Wallet className="h-12 w-12 text-blue-700" aria-hidden />
        <h1 className="text-3xl font-semibold tracking-tight">Expense Tracker</h1>
        <p className="text-sm text-slate-600">Phase 0 scaffolding is live.</p>
      </div>
    </main>
  );
}
