import type { Metadata, Viewport } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'
import { BottomNavigation } from '@/components/layout/BottomNavigation'

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ขายไปเหอะ',
  description: 'ขายอะไรได้ก็ขายไปเหอะ',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100',
    apple: 'https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={kanit.className}>
        {children}
        <BottomNavigation />
      </body>
    </html>
  )
}