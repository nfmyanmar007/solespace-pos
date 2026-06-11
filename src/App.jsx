import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './context/SessionContext'
import LoginPage from './pages/LoginPage'
import POSHome from './pages/POSHome'

function ProtectedRoute({ children }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <POSHome />
          </ProtectedRoute>
        }
      />
      <Route path="/pos/payment" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-4xl mb-4">💳</div>
              <h1 className="text-xl font-bold mb-2">Payment Screen</h1>
              <p className="text-slate-400 text-sm">Coming on Day 5</p>
            </div>
          </div>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
