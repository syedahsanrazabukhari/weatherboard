import React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { ThemePreference, useTheme } from '../hooks/useTheme'
import { SegmentedControl, SegmentOption } from './SegmentedControl'

const OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: 'system', label: <Monitor className="h-4 w-4" />, ariaLabel: 'Use system theme' },
  { value: 'light', label: <Sun className="h-4 w-4" />, ariaLabel: 'Light theme' },
  { value: 'dark', label: <Moon className="h-4 w-4" />, ariaLabel: 'Dark theme' },
]

/** System / Light / Dark switch. "System" follows the OS and live changes. */
export const ThemeToggle: React.FC = () => {
  const { preference, setPreference } = useTheme()
  return <SegmentedControl label="Colour theme" value={preference} options={OPTIONS} onChange={setPreference} />
}