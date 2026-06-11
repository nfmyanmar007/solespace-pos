import React, { createContext, useContext, useState } from 'react'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const path = window.location.pathname
      if (path.indexOf('admin') !== -1) return null
      const saved = localStorage.getItem('pos_session')
      return saved ? JSON.parse(saved) : null
    } catch (e) {
      return null
    }
  })

  const login = (staffMember) => {
    const sessionData = {
      staffId: staffMember.id,
      staffName: staffMember.full_name,
      role: staffMember.role,
      storeId: staffMember.store_id,
      loginTime: new Date().toISOString(),
    }
    setSession(sessionData)
    localStorage.setItem('pos_session', JSON.stringify(sessionData))
  }

  const logout = () => {
    setSession(null)
    localStorage.removeItem('pos_session')
  }

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within SessionProvider')
  return context
}
