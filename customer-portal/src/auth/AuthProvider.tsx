import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  confirmResetPassword as amplifyConfirmResetPassword,
  getCurrentUser,
  resetPassword as amplifyResetPassword,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from "aws-amplify/auth";

type AuthUser = {
  username: string;
  userId: string;
  email?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();

      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId,
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    }

    void restoreSession();
  }, [refreshUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await amplifySignIn({
        username: email,
        password,
      });

      if (!result.isSignedIn) {
        throw new Error(
          `Additional sign-in step required: ${result.nextStep.signInStep}`,
        );
      }

      await refreshUser();
    },
    [refreshUser],
  );

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      await amplifyResetPassword({
        username: email,
      });
    },
    [],
  );

  const confirmPasswordReset = useCallback(
    async (
      email: string,
      code: string,
      newPassword: string,
    ) => {
      await amplifyConfirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      signIn,
      signOut,
      requestPasswordReset,
      confirmPasswordReset,
      refreshUser,
    }),
    [
      user,
      loading,
      signIn,
      signOut,
      requestPasswordReset,
      confirmPasswordReset,
      refreshUser,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

