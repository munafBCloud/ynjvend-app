import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
} from 'aws-amplify/auth'

interface AuthContextValue {
  authenticated: boolean
  loading: boolean
  email: string | null
  login: (
    email: string,
    password: string,
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function restoreSession() {
      try {
        const user = await getCurrentUser()
        const session = await fetchAuthSession()

        if (session.tokens?.accessToken) {
          setAuthenticated(true)
          setEmail(user.signInDetails?.loginId ?? user.username)
        }
      } catch {
        setAuthenticated(false)
        setEmail(null)
      } finally {
        setLoading(false)
      }
    }

    void restoreSession()
  }, [])

  async function login(
    loginEmail: string,
    password: string,
  ) {
    const result = await signIn({
      username: loginEmail,
      password,
    })

    if (!result.isSignedIn) {
      throw new Error(
        `Additional Cognito sign-in step required: ${result.nextStep.signInStep}`,
      )
    }

    const user = await getCurrentUser()

    setAuthenticated(true)
    setEmail(user.signInDetails?.loginId ?? loginEmail)
  }

  async function logout() {
    await signOut()
    setAuthenticated(false)
    setEmail(null)
  }

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        loading,
        email,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.',
    )
  }

  return context
}
