import { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import { NextRouter, useRouter } from 'next/router'
import { setTimeout } from 'timers';

interface HeaderPrimaryProps {
  toggleIsSigningOut: () => void;
};

const HeaderPrimary: React.FC<HeaderPrimaryProps> = (props): React.ReactElement => {
  const router: NextRouter = useRouter();

  const [state, setState] = useState<string>('');

  const onClickHandler = async (): Promise<void> => {
    try {
      props.toggleIsSigningOut();
      setTimeout(async () => {
        await Auth.signOut();
        localStorage.clear(); 
        router.push('/');
        props.toggleIsSigningOut();
      }, 3000);
    } catch (error) {
      console.log('error signing out: ', error);
      props.toggleIsSigningOut();
    };
  };

  const onMount = async (): Promise<void> => {
    try {
      const currentUser = await Auth.currentUserInfo();
      const friendlyUsername: string = currentUser.attributes['custom:friendly_username'] ? currentUser.attributes['custom:friendly_username'] : '';

      setState(friendlyUsername);
    } catch (error ) {
      console.log('error signing out: ', error);
      props.toggleIsSigningOut();
    };
  };

  useEffect(() => {
    if ( !state ) onMount();
  }, []);

  return (
    <div className='header-primary-container'>
      <div className='inner-container'>
        <div className='container-h'>
          <div className='column'>
            <span>User: { state }</span>
          </div>
          <div className='column'>
            <button onClick={onClickHandler}>Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderPrimary;