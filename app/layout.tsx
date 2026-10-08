import type { Metadata } from "next"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Adesse",
  icons: {
    icon: "/adesse-favicon.svg",
    shortcut: "/adesse-favicon.svg",
    apple: "/adesse-favicon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  )
}
