import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-cream text-center px-6">
      <p className="font-display text-5xl text-indigo/20">404</p>
      <h1 className="font-display text-xl text-indigo font-semibold">Page not found</h1>
      <p className="text-ink/60 text-sm max-w-sm">The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="btn-primary mt-2">Back home</Link>
    </div>
  )
}
