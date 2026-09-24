import { Amplify } from 'aws-amplify'

const region = import.meta.env.VITE_AWS_REGION
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID

if (!region || !userPoolId || !userPoolClientId) {
  throw new Error('Missing Cognito environment configuration.')
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    },
  },
})
