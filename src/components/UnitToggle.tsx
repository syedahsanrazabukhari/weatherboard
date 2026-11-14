import React from 'react'
import { useUnit } from '../hooks/useUnit'
import { Unit } from '../lib/units'
import { SegmentedControl, SegmentOption } from './SegmentedControl'

const OPTIONS: SegmentOption<Unit>[] = [
  { value: 'c', label: '°C', ariaLabel: 'Celsius and km/h' },
  { value: 'f', label: '°F', ariaLabel: 'Fahrenheit and mph' },
]

/** °C / °F switch. Updates instantly (values are converted, never refetched). */
export const UnitToggle: React.FC = () => {
  const { unit, setUnit } = useUnit()
  return <SegmentedControl label="Temperature unit" value={unit} options={OPTIONS} onChange={setUnit} />
}