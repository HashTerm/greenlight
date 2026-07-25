import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link href="/">Go back home</Link>
    </div>
  )
}
