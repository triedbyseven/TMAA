import '../styles/globals.css';
import 'tailwindcss/tailwind.css';

import { Amplify } from 'aws-amplify';

import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/dist/styles.css';

import awsExports from '../aws-exports';
Amplify.configure(awsExports);


function MyApp({ Component, pageProps }: any) {
  return <Component {...pageProps} />
}

export default withAuthenticator(MyApp, {
  'hideSignUp': true,
  'loginMechanisms': ["phone_number"] 
});