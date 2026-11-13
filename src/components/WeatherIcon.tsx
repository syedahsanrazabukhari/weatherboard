import React, { useId } from 'react'
import { WeatherCondition } from '../types'

interface WeatherIconProps {
  condition: WeatherCondition
  isNight?: boolean
  className?: string
  size?: number
  /** Turn the CSS animations off (e.g. for dense lists). Defaults to true. */
  animated?: boolean
}

const CLOUD_PATH =
  'M18 48a11 11 0 0 1-1.2-21.9A15 15 0 0 1 45.5 24.5 11.5 11.5 0 0 1 46 48Z'

const GLOWS: Record<string, string> = {
  sun: 'drop-shadow(0 0 10px rgba(255,170,40,0.45))',
  moon: 'drop-shadow(0 0 9px rgba(190,180,235,0.35))',
  cloud: 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))',
  storm: 'drop-shadow(0 0 9px rgba(255,200,60,0.30))',
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  condition,
  isNight = false,
  className = 'h-6 w-6',
  size,
  animated = true,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const id = (name: string) => `${name}-${uid}`
  const a = animated ? '' : ' wx-still'

  const defs = (
    <defs>
      <radialGradient id={id('sun')} cx="38%" cy="34%" r="75%">
        <stop offset="0%" stopColor="#FFE9A0" />
        <stop offset="55%" stopColor="#FFBE3D" />
        <stop offset="100%" stopColor="#FF8A1F" />
      </radialGradient>
      <linearGradient id={id('moon')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#C9C3E4" />
      </linearGradient>
      <linearGradient id={id('cloud')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#C4CAD3" />
      </linearGradient>
      <linearGradient id={id('dark')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#B4BAC4" />
        <stop offset="100%" stopColor="#6F7580" />
      </linearGradient>
      <linearGradient id={id('storm')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8F95A0" />
        <stop offset="100%" stopColor="#4A4F59" />
      </linearGradient>
      <linearGradient id={id('bolt')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF1A8" />
        <stop offset="100%" stopColor="#FFB020" />
      </linearGradient>
      <mask id={id('crescent')}>
        <rect width="64" height="64" fill="#fff" />
        <circle cx="40" cy="25" r="13" fill="#000" />
      </mask>
    </defs>
  )

  const sun = (cx: number, cy: number, r: number, rayIn: number, rayOut: number) => (
    <g>
      <g className={`wx-anim wx-spin${a}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy - rayIn}
            x2={cx}
            y2={cy - rayOut}
            stroke="#FFC247"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${i * 45} ${cx} ${cy})`}
          />
        ))}
      </g>
      <circle className={`wx-anim wx-pulse${a}`} cx={cx} cy={cy} r={r} fill={`url(#${id('sun')})`} />
    </g>
  )

  const moon = (scale = 1, tx = 0, ty = 0, stars = true) => (
    <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
      <circle
        className={`wx-anim wx-pulse${a}`}
        cx="30"
        cy="34"
        r="16"
        fill={`url(#${id('moon')})`}
        mask={`url(#${id('crescent')})`}
      />
      {stars && (
        <>
          <circle className={`wx-anim wx-twinkle${a}`} cx="46" cy="14" r="1.6" fill="#fff" />
          <circle className={`wx-anim wx-twinkle${a}`} style={{ animationDelay: '0.9s' }} cx="53" cy="30" r="1.2" fill="#fff" />
          <circle className={`wx-anim wx-twinkle${a}`} style={{ animationDelay: '1.6s' }} cx="15" cy="15" r="1.3" fill="#fff" />
        </>
      )}
    </g>
  )

  const cloud = (fill: string, transform = '', floatClass = 'wx-float') => (
    <g transform={transform}>
      <path className={`wx-anim ${floatClass}${a}`} d={CLOUD_PATH} fill={`url(#${fill})`} />
    </g>
  )

  const drops = (count: number, color: string, len: number, width: number) => (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const x = count === 3 ? 24 + i * 10 : 21 + i * 8.5
        return (
          <line
            key={i}
            className={`wx-anim wx-drop${a}`}
            style={{ animationDelay: `${i * 0.32}s` }}
            x1={x}
            y1={51}
            x2={x - 2}
            y2={51 + len}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
          />
        )
      })}
    </>
  )

  let body: React.ReactNode
  let glow = GLOWS.cloud

  switch (condition) {
    case 'clear':
      glow = isNight ? GLOWS.moon : GLOWS.sun
      body = isNight ? moon() : sun(32, 32, 12, 18, 25)
      break

    case 'partly-cloudy':
      glow = isNight ? GLOWS.moon : GLOWS.sun
      body = (
        <>
          {isNight ? moon(0.62, 0, -4, false) : sun(24, 24, 9, 14, 20)}
          {cloud(id('cloud'), 'translate(12 10) scale(.8)')}
        </>
      )
      break

    case 'cloudy':
      body = (
        <>
          {cloud(id('dark'), 'translate(18 -3) scale(.72)', 'wx-float-alt')}
          {cloud(id('cloud'), 'translate(0 4)')}
        </>
      )
      break

    case 'fog':
      body = (
        <>
          {cloud(id('dark'), 'translate(0 -4)')}
          <g stroke="#C9CDD4" strokeWidth="3" strokeLinecap="round">
            <line className={`wx-anim wx-drift${a}`} x1="14" y1="52" x2="42" y2="52" />
            <line className={`wx-anim wx-drift${a}`} style={{ animationDelay: '-1.4s' }} x1="22" y1="58" x2="52" y2="58" />
          </g>
        </>
      )
      break

    case 'drizzle':
      body = (
        <>
          {cloud(id('dark'), 'translate(0 -4)')}
          {drops(4, '#A9C7E3', 5, 2)}
        </>
      )
      break

    case 'rain':
      body = (
        <>
          {cloud(id('dark'), 'translate(0 -4)')}
          {drops(3, '#8DB9E6', 8, 3)}
        </>
      )
      break

    case 'thunderstorm':
      glow = GLOWS.storm
      body = (
        <>
          {cloud(id('storm'), 'translate(0 -5)')}
          <path
            className={`wx-anim wx-flash${a}`}
            d="M34 42 25 54h7l-3 8 12-14h-7l4-6Z"
            fill={`url(#${id('bolt')})`}
          />
        </>
      )
      break

    case 'snow':
      body = (
        <>
          {cloud(id('dark'), 'translate(0 -4)')}
          {[24, 34, 44].map((x, i) => (
            <circle
              key={x}
              className={`wx-anim wx-flake${a}`}
              style={{ animationDelay: `${i * 0.5}s` }}
              cx={x}
              cy={52}
              r="2.4"
              fill="#FFFFFF"
            />
          ))}
        </>
      )
      break

    default:
      body = cloud(id('cloud'), 'translate(0 4)')
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ filter: glow, overflow: 'visible' }}
      aria-hidden="true"
      focusable="false"
    >
      {defs}
      {body}
    </svg>
  )
}