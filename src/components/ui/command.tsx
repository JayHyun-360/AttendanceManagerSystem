"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl bg-white text-slate-900", className)} {...props} />
}

function CommandDialog({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props}><DialogContent className="overflow-hidden p-0"><Command>{children}</Command></DialogContent></Dialog>
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return <div className="flex items-center gap-2 border-b border-slate-100 px-4"><Search className="size-4 shrink-0 text-slate-400" /><CommandPrimitive.Input className={cn("flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400", className)} {...props} /></div>
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className={cn("max-h-[min(420px,60vh)] overflow-y-auto p-2", className)} {...props} />
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className={cn("px-3 py-8 text-center text-sm text-slate-500", className)} {...props} />
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return <CommandPrimitive.Group className={cn("overflow-hidden p-1 text-slate-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest", className)} {...props} />
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item className={cn("flex min-h-11 cursor-default items-center gap-3 rounded-lg px-3 text-sm outline-none data-[selected=true]:bg-emerald-50 data-[selected=true]:text-emerald-800", className)} {...props} />
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem }
