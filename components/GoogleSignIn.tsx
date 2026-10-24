'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { createClient } from '@/utils/supabase/client';

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleButtonSize = 'small' | 'medium' | 'large';
type GoogleButtonType = 'standard' | 'icon';

type GoogleAccountsId = {
  initialize: (configuration: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce: string;
    use_fedcm_for_prompt: boolean;
    ux_mode: 'popup';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme: 'filled_black';
      shape: 'pill';
      text: 'continue_with';
      locale: 'es';
      size?: GoogleButtonSize;
      type?: GoogleButtonType;
    },
  ) => void;
  prompt: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

type GoogleSignInProps = {
  next?: string;
  oneTap?: boolean;
  size?: GoogleButtonSize;
  type?: GoogleButtonType;
  onError?: (message: string) => void;
};

function isSafeNext(next: string | undefined): next is string {
  return Boolean(next && /^\/(?![\/\\])/.test(next));
}

async function generateNonce(): Promise<[string, string]> {
  const rawNonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return [rawNonce, hashedNonce];
}

export default function GoogleSignIn({
  next,
  oneTap = false,
  size = 'large',
  type = 'standard',
  onError,
}: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initializeGoogle = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const google = window.google;

    if (!clientId || !google) {
      onError?.('No pudimos cargar el inicio de sesión con Google. Intentá nuevamente.');
      return;
    }

    try {
      const [rawNonce, hashedNonce] = await generateNonce();
      const supabase = createClient();

      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response.credential) {
            onError?.('No recibimos una credencial de Google. Intentá nuevamente.');
            return;
          }

          try {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
              nonce: rawNonce,
            });

            if (error) {
              onError?.(`No pudimos iniciar sesión con Google: ${error.message}`);
              return;
            }

            router.replace(isSafeNext(next) ? next : '/');
            router.refresh();
          } catch {
            onError?.('No pudimos iniciar sesión con Google. Intentá nuevamente.');
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
        ux_mode: 'popup',
      });

      if (buttonRef.current) {
        buttonRef.current.replaceChildren();
        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          shape: 'pill',
          text: 'continue_with',
          locale: 'es',
          size,
          type,
        });
      }

      if (oneTap) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          google.accounts.id.prompt();
        }
      }
    } catch {
      onError?.('No pudimos cargar el inicio de sesión con Google. Intentá nuevamente.');
    }
  }, [next, onError, oneTap, router, size, type]);

  return (
    <>
      <Script
        id="google-identity-services"
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => {
          void initializeGoogle();
        }}
      />
      <div ref={buttonRef} className="flex justify-center" />
    </>
  );
}
