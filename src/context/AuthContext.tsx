'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js'
import { cognitoConfig } from '@/lib/cognito-config'

const configReady = !!(cognitoConfig.UserPoolId && cognitoConfig.ClientId)
const userPool = configReady ? new CognitoUserPool(cognitoConfig) : null

export interface SignUpResult {
  userSub: string
  userConfirmed: boolean
}

interface AuthContextValue {
  user: CognitoUser | null | undefined
  userEmail: string
  signIn: (email: string, password: string) => Promise<unknown>
  signUp: (email: string, password: string, name: string, attributes?: Record<string, string>) => Promise<SignUpResult>
  confirmSignUp: (email: string, code: string) => Promise<void>
  resendConfirmationCode: (email: string) => Promise<void>
  signOut: () => void
  forgotPassword: (email: string) => Promise<void>
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>
  getIdToken: () => Promise<string>
  completeNewPassword: (cognitoUser: CognitoUser, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<CognitoUser | null | undefined>(undefined)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (!userPool) { setUser(null); return }
    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) { setUser(null); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cognitoUser.getSession((err: Error | null, session: any) => {
      if (!err && session?.isValid()) {
        setUser(cognitoUser)
        setUserEmail(session.getIdToken().decodePayload().email ?? '')
      } else {
        setUser(null)
      }
    })
  }, [])

  function signIn(email: string, password: string) {
    if (!userPool) return Promise.reject(new Error('Cognito not configured. Run setup-cognito workflow first.'))
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! })
      const authDetails = new AuthenticationDetails({ Username: email, Password: password })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cognitoUser.authenticateUser(authDetails, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (session: any) => {
          setUser(cognitoUser)
          setUserEmail(session.getIdToken().decodePayload().email ?? email)
          resolve(session)
        },
        onFailure: reject,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newPasswordRequired: (_userAttributes: any) =>
          resolve({ newPasswordRequired: true as const, cognitoUser }),
      })
    })
  }

  function signUp(
    email: string,
    password: string,
    name: string,
    attributes: Record<string, string> = {},
  ): Promise<SignUpResult> {
    if (!userPool) return Promise.reject(new Error('Cognito not configured.'))
    return new Promise((resolve, reject) => {
      const attrs = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name',  Value: name  }),
        ...Object.entries(attributes).map(([Name, Value]) => new CognitoUserAttribute({ Name, Value })),
      ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userPool!.signUp(email, password, attrs, [], (err: any, result: any) => {
        if (err) { reject(err); return }
        resolve({ userSub: result?.userSub ?? '', userConfirmed: !!result?.userConfirmed })
      })
    })
  }

  function confirmSignUp(email: string, code: string): Promise<void> {
    if (!userPool) return Promise.reject(new Error('Cognito not configured.'))
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! })
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) { reject(err); return }
        resolve()
      })
    })
  }

  function resendConfirmationCode(email: string): Promise<void> {
    if (!userPool) return Promise.reject(new Error('Cognito not configured.'))
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! })
      cognitoUser.resendConfirmationCode((err) => {
        if (err) { reject(err); return }
        resolve()
      })
    })
  }

  function signOut() {
    userPool?.getCurrentUser()?.signOut()
    setUser(null)
    setUserEmail('')
  }

  function forgotPassword(email: string): Promise<void> {
    if (!userPool) return Promise.reject(new Error('Cognito not configured.'))
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! })
      cognitoUser.forgotPassword({
        onSuccess: () => resolve(),
        onFailure: reject,
      })
    })
  }

  function confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    if (!userPool) return Promise.reject(new Error('Cognito not configured.'))
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! })
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: reject,
      })
    })
  }

  function completeNewPassword(cognitoUser: CognitoUser, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (session: any) => {
          setUser(cognitoUser)
          setUserEmail(session.getIdToken().decodePayload().email ?? '')
          resolve()
        },
        onFailure: reject,
      })
    })
  }

    function getIdToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!userPool) return reject(new Error('Cognito not configured'))
      const cu = userPool.getCurrentUser()
      if (!cu) return reject(new Error('Not authenticated'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cu.getSession((err: Error | null, session: any) => {
        if (err || !session?.isValid()) return reject(err || new Error('Session invalid'))
        resolve(session.getIdToken().getJwtToken())
      })
    })
  }

  return (
    <AuthContext.Provider value={{ user, userEmail, signIn, signUp, confirmSignUp, resendConfirmationCode, signOut, forgotPassword, confirmForgotPassword, getIdToken, completeNewPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
