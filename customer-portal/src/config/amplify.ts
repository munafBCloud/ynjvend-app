import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_hMX56kwza",
      userPoolClientId: "4ha8unhf15v9c8mdqq5r5u3e27",
      loginWith: {
        email: true,
      },
    },
  },
});
