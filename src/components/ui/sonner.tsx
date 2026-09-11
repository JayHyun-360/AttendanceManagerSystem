import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      toastOptions={{
        classNames: {
          toast: "border border-slate-200 bg-white text-slate-900",
          title: "font-semibold",
          description: "text-slate-500",
          actionButton: "bg-green-600 text-white",
          cancelButton: "bg-slate-100 text-slate-900",
        },
      }}
    />
  );
}
