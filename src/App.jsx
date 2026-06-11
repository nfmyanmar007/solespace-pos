import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './context/SessionContext'

// POS pages
import LoginPage    from './pages/LoginPage'
import POSHome      from './pages/POSHome'
import PaymentPage  from './pages/PaymentPage'
import ReceiptPage  from './pages/ReceiptPage'
import SummaryPage  from './pages/SummaryPage'

// Admin pages
import AdminLogin     from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

function ProtectedRoute({ children }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/" replace />
  return children
}

function AdminRoute({ children }) {
  const session = localStorage.getItem('admin_session')
  if (!session) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* POS routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/pos" element={
        <ProtectedRoute><POSHome /></ProtectedRoute>
      } />
      <Route path="/pos/payment" element={
        <ProtectedRoute><PaymentPage /></ProtectedRoute>
      } />
      <Route path="/pos/receipt/:txnId" element={
        <ProtectedRoute><ReceiptPage /></ProtectedRoute>
      } />
      <Route path="/pos/summary" element={
        <ProtectedRoute><SummaryPage /></ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={
        <AdminRoute><AdminDashboard /></AdminRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
