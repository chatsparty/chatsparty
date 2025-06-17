import { FaMoon, FaSun } from 'react-icons/fa'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <FaMoon className="h-4 w-4" />
      ) : (
        <FaSun className="h-4 w-4" />
      )}
    </Button>
  )
}