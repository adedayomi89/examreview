import { useSettings } from '../contexts/SettingsContext'

export function BrandMark({ size = 44 }) {
  const { settings } = useSettings()
  return (
    <img
      src={settings.logo_url}
      alt={settings.church_name}
      style={{ width: size, height: size }}
      className="rounded-full object-cover shadow-card"
    />
  )
}

export function BrandHeading({ align = 'left', subtitle }) {
  const { settings } = useSettings()
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      <p className="font-display text-xs tracking-[0.18em] text-gold-dim mb-1">
        {settings.department_name?.toUpperCase()}
      </p>
      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-indigo leading-snug">
        {settings.church_name}
      </h1>
      {subtitle && <p className="mt-2 text-ink/60 text-[15px]">{subtitle}</p>}
    </div>
  )
}
