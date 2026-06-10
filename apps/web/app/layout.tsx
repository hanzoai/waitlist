import './globals.css'
import '@hanzo/waitlist/styles.css'

export const metadata = {
  title: 'Hanzo Waitlist',
  description: 'Monochromatic, brand-neutral viral waitlist. Backed by Hanzo Base.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
