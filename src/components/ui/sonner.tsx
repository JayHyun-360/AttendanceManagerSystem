import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={4200}
      toastOptions={{
        classNames: {
          toast: "w-[calc(100vw-2rem)] sm:w-[360px] border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-900/10",
          title: "font-semibold",
          description: "text-slate-500",
          actionButton: "bg-emerald-500 text-white",
          cancelButton: "bg-slate-100 text-slate-900",
        },
      }}
    />
  );
}
