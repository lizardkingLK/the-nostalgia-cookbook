'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, ShieldCheck, Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = '229914304371-8bnv5okv71gc863iqh7o9u7o3fjsqr7p.apps.googleusercontent.com';

interface GoogleSignInButtonProps {
  userSession?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  onSessionChange?: (session: { name: string; email: string; image: string } | null) => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

// Decode base64 URL JWT payload safely
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  userSession,
  onSessionChange,
  onSignIn,
  onSignOut,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Google Identity Services
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setupGSI = () => {
      if ((window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response.credential) {
                const payload = parseJwt(response.credential);
                if (payload && payload.email) {
                  await syncUserWithServer({
                    email: payload.email,
                    name: payload.name || payload.email.split('@')[0],
                    image: payload.picture || '',
                    googleId: payload.sub,
                  });
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
        } catch (err) {
          console.warn('GSI init notice:', err);
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      setupGSI();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          setupGSI();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Post verified Google user data to server to store in MongoDB and establish session
  const syncUserWithServer = async (userData: {
    email: string;
    name: string;
    image: string;
    googleId?: string;
  }) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        const data = await res.json();
        if (onSessionChange) {
          onSessionChange(data.user || userData);
        }
      } else {
        if (onSessionChange) {
          onSessionChange(userData);
        }
      }
    } catch {
      if (onSessionChange) {
        onSessionChange(userData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
      return;
    }

    setIsLoading(true);

    // Try Google OAuth2 token client first for clean popup
    const googleAccounts = (window as any).google?.accounts;
    if (googleAccounts?.oauth2) {
      try {
        const tokenClient = googleAccounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const userinfoRes = await fetch(
                  'https://www.googleapis.com/oauth2/v3/userinfo',
                  {
                    headers: {
                      Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                  }
                );
                const profile = await userinfoRes.json();
                if (profile?.email) {
                  await syncUserWithServer({
                    email: profile.email,
                    name: profile.name || profile.email.split('@')[0],
                    image: profile.picture || '',
                    googleId: profile.sub,
                  });
                }
              } catch (err) {
                console.error('Failed to fetch Google profile:', err);
              } finally {
                setIsLoading(false);
              }
            } else {
              setIsLoading(false);
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('OAuth2 client notice, trying OneTap/Prompt:', err);
      }
    }

    // Try Google OneTap prompt
    if (googleAccounts?.id) {
      try {
        googleAccounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback to NextAuth / OAuth redirect
            redirectToGoogleOAuth();
          }
          setIsLoading(false);
        });
        return;
      } catch {
        redirectToGoogleOAuth();
      }
    } else {
      redirectToGoogleOAuth();
    }
  };

  const redirectToGoogleOAuth = () => {
    setIsLoading(false);
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/google`);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=openid%20email%20profile&prompt=select_account`;
    window.location.href = googleAuthUrl;
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // Ignore network errors on signout
    }
    if (onSessionChange) {
      onSessionChange(null);
    }
    if (onSignOut) {
      onSignOut();
    }
    setShowDropdown(false);
  };

  if (userSession?.email) {
    return (
      <div className="relative font-serif">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#FDFCF7] hover:bg-[#F3EED9] border-2 border-[#D8C3B1] rounded-2xl transition-all shadow-sm group"
        >
          {userSession.image ? (
            <img
              src={userSession.image}
              alt={userSession.name || 'User'}
              className="w-7 h-7 rounded-full border border-[#94442B] object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#E7ECE8] border border-[#607D68] flex items-center justify-center text-[#3F5645] text-xs font-bold">
              {userSession.name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-bold text-[#2C1D11] leading-tight truncate max-w-[130px]">
              {userSession.name || 'Family Archivist'}
            </span>
            <span className="block text-[10px] text-[#705335] italic truncate max-w-[130px]">
              {userSession.email}
            </span>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-72 bg-[#FAF7F0] border-2 border-[#D8C3B1] rounded-2xl shadow-recipe-card p-4 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 pb-3 border-b border-[#D8C3B1]">
              {userSession.image ? (
                <img
                  src={userSession.image}
                  alt={userSession.name || 'User'}
                  className="w-10 h-10 rounded-full border border-[#94442B] object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#E7ECE8] flex items-center justify-center text-[#3F5645] font-bold">
                  {userSession.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#2C1D11] truncate">{userSession.name}</p>
                <p className="text-[10px] text-[#705335] truncate">{userSession.email}</p>
              </div>
            </div>

            <div className="py-2.5 space-y-1 text-xs text-[#705335]">
              <div className="flex items-center gap-2 text-[11px] text-[#607D68] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>MongoDB Atlas Family Vault</span>
              </div>
              <p className="text-[10px] italic leading-tight text-[#705335]">
                Signed in with Google. Only your account and family circle can view your archived recipes.
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-[#FBECE7] hover:bg-[#F5D3C8] text-[#94442B] border border-[#E8A692] rounded-xl text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 bg-[#FAF7F0] hover:bg-[#FDFCF7] text-[#4A3525] border-2 border-[#D8C3B1] hover:border-[#94442B] rounded-2xl text-xs sm:text-sm font-serif font-semibold transition-all shadow-sm hover:shadow-md group active:scale-95 disabled:opacity-70"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#94442B]" />
      ) : (
        /* Timeless Vintage Google Emblem */
        <div className="w-5 h-5 rounded-full bg-white border border-[#D8C3B1] flex items-center justify-center p-0.5 shadow-vintage-inset">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        </div>
      )}
      <span className="group-hover:text-[#94442B] transition-colors">
        {isLoading ? 'Connecting Google...' : 'Sign in with Google'}
      </span>
    </button>
  );
};

export default GoogleSignInButton;
