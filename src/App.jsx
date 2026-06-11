import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './context/SessionContext'
import LoginPage   from './pages/LoginPage'
import POSHome     from './pages/POSHome'
import PaymentPage from './pages/PaymentPage'
import ReceiptPage from './pages/ReceiptPage'
import SummaryPage from './pages/SummaryPage'
import AdminLogin     from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

function ProtectedRoute({ children }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/" replace />
  return children
}

function AdminRoute({ children }) {
  try {
    const raw = localStorage.getItem('admin_session')
    if (!raw) return <Navigate to="/admin-login" replace />
    return children
  } catch {
    return <Navigate to="/admin-login" replace />
  }
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/pos" element={<ProtectedRoute><POSHome /></ProtectedRoute>} />
      <Route path="/pos/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
      <Route path="/pos/receipt/:txnId" element={<ProtectedRoute><ReceiptPage /></ProtectedRoute>} />
      <Route path="/pos/summary" element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
