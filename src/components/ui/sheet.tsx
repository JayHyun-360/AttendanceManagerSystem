"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close

function SheetContent({ side = "left", className, children, showClose = true, ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "left" | "right" | "top" | "bottom"; showClose?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
      <SheetPrimitive.Content className={cn("fixed z-50 flex h-full w-[min(18rem,calc(100vw-1rem))] flex-col border-slate-200 bg-white shadow-2xl outline-none", side === "left" && "inset-y-0 left-0 border-r", side === "right" && "inset-y-0 right-0 border-l", side === "top" && "inset-x-0 top-0 border-b", side === "bottom" && "inset-x-0 bottom-0 border-t", className)} {...props}>
        {children}
        {showClose && <SheetPrimitive.Close className="absolute right-3 top-3 rounded-md p-2 text-slate-400 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Close navigation"><X className="size-4" /></SheetPrimitive.Close>}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent }
