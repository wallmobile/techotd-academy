"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { registerAction } from "@/lib/auth/actions";

const svg = { viewBox: "0 0 20 20", width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
const userIcon = (
  <svg {...svg}>
    <circle cx="10" cy="7" r="3.2" />
    <path d="M3.5 17c.8-3 3.4-4.6 6.5-4.6s5.7 1.6 6.5 4.6" />
  </svg>
);
const mailIcon = (
  <svg {...svg}>
    <rect x="2.5" y="4" width="15" height="12" rx="2.5" />
    <path d="M3 6l7 5 7-5" />
  </svg>
);
const phoneIcon = (
  <svg {...svg}>
    <path d="M5 3h3l1.4 3.6-1.8 1.2a9 9 0 004.6 4.6l1.2-1.8L17 12v3a2 2 0 01-2 2A12 12 0 013 5a2 2 0 012-2z" />
  </svg>
);
const lockIcon = (
  <svg {...svg}>
    <rect x="4" y="9" width="12" height="8" rx="2.5" />
    <path d="M7 9V6.5a3 3 0 016 0V9" />
  </svg>
);

const initialState = { status: "idle", errors: {}, formError: null, values: {} };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {state.formError && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-[13px] text-danger sm:col-span-2">
          {state.formError}
        </p>
      )}

      <Input
        label="Full Name"
        icon={userIcon}
        id="name"
        name="name"
        autoComplete="name"
        defaultValue={state.values?.name}
        error={state.errors?.name}
        required
      />

      <Input
        label="Phone (optional)"
        icon={phoneIcon}
        id="phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={state.values?.phone}
        error={state.errors?.phone}
      />

      <div className="sm:col-span-2">
        <Input
          label="Email"
          icon={mailIcon}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.errors?.email}
          required
        />
      </div>

      <PasswordField
        label="Password"
        icon={lockIcon}
        id="password"
        name="password"
        autoComplete="new-password"
        error={state.errors?.password}
      />

      <PasswordField
        label="Confirm Password"
        icon={lockIcon}
        id="confirmPassword"
        name="confirmPassword"
        autoComplete="new-password"
        error={state.errors?.confirmPassword}
      />

      <div className="sm:col-span-2">
        <label className="flex items-start gap-2.5 text-[13px] text-text">
          <input
            type="checkbox"
            name="consent"
            className="mt-0.5 h-4 w-4 rounded border-border"
            aria-invalid={Boolean(state.errors?.consent) || undefined}
            aria-describedby={state.errors?.consent ? "consent-error" : undefined}
          />
          <span>
            I agree to TechOTD Academy&apos;s Terms of Use and Privacy Policy.
          </span>
        </label>
        {state.errors?.consent && (
          <p id="consent-error" className="mt-1.5 text-sm text-danger">
            {state.errors.consent}
          </p>
        )}
      </div>

      <div className="sm:col-span-2">
        <AuthSubmitButton className="w-full">Create account</AuthSubmitButton>
      </div>

      <p className="text-center text-[13px] text-muted sm:col-span-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
