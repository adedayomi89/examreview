export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-cream">
      <div className="w-10 h-10 rounded-full border-2 border-indigo/15 border-t-gold animate-spin" />
      <p className="text-sm text-indigo/60 font-medium tracking-wide">{label}</p>
    </div>
  )
}
