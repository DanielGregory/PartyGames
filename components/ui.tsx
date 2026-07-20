import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent hover:bg-accent-hover text-white",
  secondary: "bg-card border border-card-border text-foreground hover:border-accent",
  danger: "bg-red-600 hover:bg-red-500 text-white",
  ghost: "bg-transparent text-muted hover:text-foreground",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`w-full rounded-2xl px-6 py-4 text-lg font-semibold transition-colors active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={`w-full rounded-2xl border border-card-border bg-card px-5 py-4 text-lg text-foreground placeholder:text-muted focus:border-accent focus:outline-none ${className}`}
      {...rest}
    />
  );
}

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-card-border bg-card p-5 ${className}`}
      {...props}
    />
  );
}
