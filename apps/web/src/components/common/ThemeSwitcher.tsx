import { Palette } from 'lucide-react';
import { useLandingTheme, themeKeys, themeColors, themes } from '../../hooks/useLandingTheme';

export function ThemeSwitcher({ inline = false }: { inline?: boolean }) {
  const { theme, setTheme } = useLandingTheme();

  if (inline) {
    return (
      <div className="flex items-center gap-1.5">
        {themeKeys.map((key) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={`w-5 h-5 rounded-full ${themeColors[key]} transition-all ${
              theme === key ? 'ring-2 ring-current scale-110' : 'opacity-50 hover:opacity-100'
            }`}
            title={themes[key].label}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-xl border border-gray-700">
      <Palette className="w-4 h-4 text-gray-400" />
      {themeKeys.map((key) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          className={`w-7 h-7 rounded-full ${themeColors[key]} transition-all flex items-center justify-center ${
            theme === key ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'opacity-60 hover:opacity-100'
          }`}
          title={themes[key].label}
        >
          {theme === key && <span className="text-white text-xs font-bold">&#10003;</span>}
        </button>
      ))}
    </div>
  );
}
