import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri();

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  title: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro';
  default_units: 'metric' | 'imperial';
  language: string;
  auto_backup: boolean;
}

interface AuthStore {
  session: Session | null;
  profile: UserProfile | null;
  isInitialized: boolean;
  isLoading: boolean;

  initialize: () => () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithProvider: (provider: 'google' | 'facebook') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  deleteAccount: () => Promise<{ error: string | null }>;
  createSessionFromUrl: (url: string) => Promise<void>;
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    title: data.title,
    avatar_url: data.avatar_url,
    plan: data.plan,
    default_units: data.default_units,
    language: data.language,
    auto_backup: data.auto_backup,
  };
}

function profileFromSession(session: Session): UserProfile {
  const { user } = session;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    name: meta.name ?? meta.full_name ?? user.email?.split('@')[0] ?? 'Chef',
    title: meta.title ?? null,
    avatar_url: meta.avatar_url ?? meta.picture ?? null,
    plan: 'free',
    default_units: 'metric',
    language: 'en',
    auto_backup: true,
  };
}

async function resolveProfile(session: Session): Promise<UserProfile> {
  const dbProfile = await fetchProfile(session.user.id);
  return dbProfile ?? profileFromSession(session);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  profile: null,
  isInitialized: false,
  isLoading: false,

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session ? await resolveProfile(session) : null;
      set({ session, profile, isInitialized: true });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session ? await resolveProfile(session) : null;
      set({ session, profile });
    });

    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      get().createSessionFromUrl(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  },

  createSessionFromUrl: async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) return;
    const { access_token, refresh_token } = params;
    if (!access_token) return;

    await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    set({ isLoading: false });
    if (error?.message === 'Email not confirmed') {
      return { error: 'Please check your email and confirm your account before signing in.' };
    }
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password, name) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
      },
    });
    set({ isLoading: false });
    const needsConfirmation = !error && !data.session;
    return { error: error?.message ?? null, needsConfirmation };
  },

  signInWithProvider: async (provider) => {
    try {
      set({ isLoading: true });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        set({ isLoading: false });
        const msg = error?.message ?? 'Failed to start OAuth flow';
        if (msg.includes('provider is not enabled')) {
          return { error: `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not yet configured. Please use email and password.` };
        }
        return { error: msg };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const { params, errorCode } = QueryParams.getQueryParams(result.url);

        if (errorCode) {
          set({ isLoading: false });
          return { error: errorCode };
        }

        const { access_token, refresh_token } = params;
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          set({ isLoading: false });
          return { error: sessionError?.message ?? null };
        }
      }

      set({ isLoading: false });
      return { error: null };
    } catch (e: unknown) {
      set({ isLoading: false });
      const message = e instanceof Error ? e.message : 'OAuth sign-in failed';
      return { error: message };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error: error?.message ?? null };
  },

  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  },

  updateProfile: (updates) => {
    const current = get().profile;
    if (!current) return;

    const merged = { ...current, ...updates };
    set({ profile: merged });

    supabase
      .from('profiles')
      .update({
        name: merged.name,
        title: merged.title,
        avatar_url: merged.avatar_url,
        default_units: merged.default_units,
        language: merged.language,
        auto_backup: merged.auto_backup,
      })
      .eq('id', current.id)
      .then(({ error }) => {
        if (error) console.warn('Profile update failed:', error.message);
      });
  },

  deleteAccount: async () => {
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) return { error: rpcError.message };
      await supabase.auth.signOut();
      set({ session: null, profile: null });
      return { error: null };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete account';
      return { error: message };
    }
  },
}));
