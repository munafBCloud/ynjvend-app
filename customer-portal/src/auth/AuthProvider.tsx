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
  confirmSignIn as amplifyConfirmSignIn,
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

export type SignInResult =
  | {
      status: "SIGNED_IN";
    }
  | {
      status: "NEW_PASSWORD_REQUIRED";
    };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<SignInResult>;
  completeNewPassword: (
    newPassword: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (
    email: string,
  ) => Promise<void>;
  confirmPasswordReset: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined,
  );

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<AuthUser | null>(null);
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
    async (
      email: string,
      password: string,
    ): Promise<SignInResult> => {
      const result = await amplifySignIn({
        username: email.trim().toLowerCase(),
        password,
      });

      if (result.isSignedIn) {
        await refreshUser();

        return {
          status: "SIGNED_IN",
        };
      }

      if (
        result.nextStep.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        return {
          status: "NEW_PASSWORD_REQUIRED",
        };
      }

      throw new Error(
        `Unsupported sign-in step: ${result.nextStep.signInStep}`,
      );
    },
    [refreshUser],
  );

  const completeNewPassword = useCallback(
    async (newPassword: string) => {
      const result = await amplifyConfirmSignIn({
        challengeResponse: newPassword,
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
      completeNewPassword,
      signOut,
      requestPasswordReset,
      confirmPasswordReset,
      refreshUser,
    }),
    [
      user,
      loading,
      signIn,
      completeNewPassword,
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
