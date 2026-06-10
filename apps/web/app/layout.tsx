import './globals.css'
import '@hanzo/waitlist/styles.css'

export const metadata = {
  title: 'Hanzo · Waitlist',
  description: 'Reserve your spot. Climb the list. Refer friends, share, invite — every action earns points.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
