import { useSyncExternalStore, useCallback } from 'react';

export type Theme = 'light-green' | 'warm-yellow' | 'dark-teal';

const STORAGE_KEY = 'edulia-landing-theme';

// Simple external store for cross-component sync
let currentTheme: Theme = (() => {
  try { return (localStorage.getItem(STORAGE_KEY) as Theme) || 'light-green'; } catch { return 'light-green'; }
})();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Theme {
  return currentTheme;
}

function setThemeGlobal(t: Theme) {
  currentTheme = t;
  try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  listeners.forEach(cb => cb());
}

export function useLandingTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  const setTheme = useCallback((t: Theme) => setThemeGlobal(t), []);
  return { theme, setTheme, ...themes[theme] };
}

export const themeKeys: Theme[] = ['light-green', 'warm-yellow', 'dark-teal'];
export const themeColors: Record<Theme, string> = {
  'light-green': 'bg-green-500',
  'warm-yellow': 'bg-amber-500',
  'dark-teal': 'bg-teal-500',
};

export const themes: Record<Theme, {
  label: string;
  bg: string; bgAlt: string;
  nav: string; navBorder: string;
  text: string; textMuted: string;
  heading: string;
  primary: string; primaryHover: string; primaryText: string;
  primaryBg: string;
  accent: string; accentBg: string;
  card: string; cardBorder: string; cardHover: string;
  ctaBg: string; ctaText: string; ctaBtn: string; ctaBtnText: string;
  footer: string; footerText: string; footerBorder: string;
  badge: string; badgeText: string; badgeBorder: string;
  trustBg: string; trustBorder: string;
  iconAccent: string;
  outlineBtn: string; outlineBtnText: string;
  githubBtn: string; githubBtnText: string;
  audienceGreen: { border: string; iconBg: string; icon: string; check: string };
  audienceTeal: { border: string; iconBg: string; icon: string; check: string };
  audienceBlue: { border: string; iconBg: string; icon: string; check: string };
}> = {
  'light-green': {
    label: 'Fresh',
    bg: 'bg-stone-50', bgAlt: 'bg-white',
    nav: 'bg-stone-50/95', navBorder: 'border-stone-200',
    text: 'text-gray-600', textMuted: 'text-gray-500',
    heading: 'text-gray-900',
    primary: 'bg-green-600', primaryHover: 'hover:bg-green-700', primaryText: 'text-white',
    primaryBg: 'bg-green-50',
    accent: 'text-green-600', accentBg: 'bg-green-50',
    card: 'bg-white', cardBorder: 'border-stone-200', cardHover: 'hover:border-green-300 hover:shadow-md',
    ctaBg: 'bg-green-600', ctaText: 'text-white', ctaBtn: 'bg-white', ctaBtnText: 'text-green-700',
    footer: 'bg-gray-900', footerText: 'text-gray-400', footerBorder: 'border-gray-800',
    badge: 'bg-green-50', badgeText: 'text-green-700', badgeBorder: 'border-green-200',
    trustBg: 'bg-green-50/60', trustBorder: 'border-stone-200',
    iconAccent: 'text-green-600',
    outlineBtn: 'border-gray-300 hover:border-gray-400 hover:bg-gray-50', outlineBtnText: 'text-gray-700',
    githubBtn: 'bg-gray-900', githubBtnText: 'text-white',
    audienceGreen: { border: 'border-green-200 hover:border-green-400', iconBg: 'bg-green-100', icon: 'text-green-600', check: 'text-green-500' },
    audienceTeal: { border: 'border-teal-200 hover:border-teal-400', iconBg: 'bg-teal-100', icon: 'text-teal-600', check: 'text-teal-500' },
    audienceBlue: { border: 'border-blue-200 hover:border-blue-400', iconBg: 'bg-blue-100', icon: 'text-blue-600', check: 'text-blue-500' },
  },
  'warm-yellow': {
    label: 'Warm',
    bg: 'bg-amber-50/30', bgAlt: 'bg-white',
    nav: 'bg-amber-50/90', navBorder: 'border-amber-200',
    text: 'text-gray-600', textMuted: 'text-gray-500',
    heading: 'text-gray-900',
    primary: 'bg-amber-500', primaryHover: 'hover:bg-amber-600', primaryText: 'text-white',
    primaryBg: 'bg-amber-50',
    accent: 'text-amber-600', accentBg: 'bg-amber-50',
    card: 'bg-white', cardBorder: 'border-amber-200/60', cardHover: 'hover:border-amber-300 hover:shadow-md',
    ctaBg: 'bg-amber-500', ctaText: 'text-white', ctaBtn: 'bg-white', ctaBtnText: 'text-amber-700',
    footer: 'bg-gray-900', footerText: 'text-gray-400', footerBorder: 'border-gray-800',
    badge: 'bg-amber-100', badgeText: 'text-amber-800', badgeBorder: 'border-amber-200',
    trustBg: 'bg-amber-50/50', trustBorder: 'border-amber-200',
    iconAccent: 'text-amber-600',
    outlineBtn: 'border-amber-300 hover:border-amber-400 hover:bg-amber-50', outlineBtnText: 'text-gray-700',
    githubBtn: 'bg-gray-900', githubBtnText: 'text-white',
    audienceGreen: { border: 'border-amber-200 hover:border-amber-400', iconBg: 'bg-amber-100', icon: 'text-amber-600', check: 'text-amber-500' },
    audienceTeal: { border: 'border-orange-200 hover:border-orange-400', iconBg: 'bg-orange-100', icon: 'text-orange-600', check: 'text-orange-500' },
    audienceBlue: { border: 'border-yellow-200 hover:border-yellow-400', iconBg: 'bg-yellow-100', icon: 'text-yellow-700', check: 'text-yellow-600' },
  },
  'dark-teal': {
    label: 'Bold',
    bg: 'bg-slate-900', bgAlt: 'bg-slate-800/50',
    nav: 'bg-slate-900/90', navBorder: 'border-slate-700',
    text: 'text-slate-300', textMuted: 'text-slate-400',
    heading: 'text-white',
    primary: 'bg-teal-500', primaryHover: 'hover:bg-teal-400', primaryText: 'text-white',
    primaryBg: 'bg-teal-900/30',
    accent: 'text-teal-400', accentBg: 'bg-teal-900/30',
    card: 'bg-slate-800/50', cardBorder: 'border-slate-700', cardHover: 'hover:border-teal-600 hover:bg-slate-800',
    ctaBg: 'bg-teal-500', ctaText: 'text-white', ctaBtn: 'bg-white', ctaBtnText: 'text-teal-700',
    footer: 'bg-slate-950', footerText: 'text-slate-500', footerBorder: 'border-slate-800',
    badge: 'bg-teal-900/40', badgeText: 'text-teal-400', badgeBorder: 'border-teal-800/50',
    trustBg: 'bg-slate-800/50', trustBorder: 'border-slate-700',
    iconAccent: 'text-teal-400',
    outlineBtn: 'border-slate-600 hover:border-slate-400', outlineBtnText: 'text-slate-200',
    githubBtn: 'bg-white', githubBtnText: 'text-gray-900',
    audienceGreen: { border: 'border-teal-800 hover:border-teal-600', iconBg: 'bg-teal-900/40', icon: 'text-teal-400', check: 'text-teal-400' },
    audienceTeal: { border: 'border-cyan-800 hover:border-cyan-600', iconBg: 'bg-cyan-900/40', icon: 'text-cyan-400', check: 'text-cyan-400' },
    audienceBlue: { border: 'border-blue-800 hover:border-blue-600', iconBg: 'bg-blue-900/40', icon: 'text-blue-400', check: 'text-blue-400' },
  },
};
