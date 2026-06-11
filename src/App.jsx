import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './context/SessionContext'
import LoginPage from './pages/LoginPage'
import POSHome from './pages/POSHome'
import PaymentPage from './pages/PaymentPage'
import ReceiptPage from './pages/ReceiptPage'
import SummaryPage from './pages/SummaryPage'

function ProtectedRoute({ children }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
