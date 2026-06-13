export const cognitoConfig = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
  ClientId:   process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID   ?? '',
}