import { Amplify } from "aws-amplify";

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;

if (!userPoolId) {
  throw new Error(
    "Missing required environment variable: VITE_COGNITO_USER_POOL_ID",
  );
}

if (!userPoolClientId) {
  throw new Error(
    "Missing required environment variable: VITE_COGNITO_USER_POOL_CLIENT_ID",
  );
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
      },
    },
  },
});
