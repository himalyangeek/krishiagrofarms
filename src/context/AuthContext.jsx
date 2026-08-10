import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const STORAGE_KEY = 'agro-store:session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const initialCheckDone = useRef(false)

  function persist(session) {
    setUser(session)
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  async function loadProfileForAuthUser() {
    const { data, error } = await supabase.rpc('get_my_profile')
    if (error || !data || data.length === 0) return null
    return data[0]
  }

  useEffect(() => {
    let active = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      const authUser = data?.session?.user
      if (authUser) {
        const profile = await loadProfileForAuthUser()
        if (active && profile) {
          persist(profile)
          initialCheckDone.current = true
          setLoading(false)
          return
        }
      }
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        try {
          if (active) setUser(JSON.parse(raw))
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      initialCheckDone.current = true
      if (active) setLoading(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' && initialCheckDone.current) {
        const profile = await loadProfileForAuthUser()
        if (profile) persist(profile)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.rpc('login_user', {
      p_email: email,
      p_password: password,
    })
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) {
      throw new Error('Invalid email or password')
    }
    persist(data[0])
    return data[0]
  }

  async function register({ email, firstName, lastName, password }) {
    const { data, error } = await supabase.rpc('register_user', {
      p_email: email,
      p_first_name: firstName,
      p_last_name: lastName,
      p_password: password,
    })
    if (error) {
      if (error.message?.includes('EMAIL_ALREADY_REGISTERED')) {
        throw new Error('This email is already registered — try logging in instead.')
      }
      throw new Error(error.message)
    }
    persist(data[0])
    return data[0]
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw new Error(error.message)
  }

  async function changePassword(oldPassword, newPassword) {
    if (!user) throw new Error('Not logged in')
    const { data, error } = await supabase.rpc('change_password', {
      p_user_id: user.userID,
      p_old_password: oldPassword,
      p_new_password: newPassword,
    })
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Current password is incorrect')
    return true
  }

  async function requestPasswordReset(email) {
    const { error } = await supabase.functions.invoke('send-password-reset', {
      body: { email },
    })
    if (error) throw new Error(error.message)
  }

  async function resetPassword(token, newPassword) {
    const { data, error } = await supabase.rpc('reset_password_with_token', {
      p_token: token,
      p_new_password: newPassword,
    })
    if (error) throw new Error(error.message)
    if (!data) throw new Error('This reset link is invalid or has expired.')
    return true
  }

  async function logout() {
    await supabase.auth.signOut()
    persist(null)
  }

  const isAdmin = user?.userType === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        login,
        register,
        loginWithGoogle,
        changePassword,
        requestPasswordReset,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
