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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
