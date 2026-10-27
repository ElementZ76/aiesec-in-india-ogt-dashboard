"use client";
// Password box for one entity. The check runs on the server (src/app/actions.ts).
import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";

export function LoginForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form action={action} className="login glass">
      <input type="hidden" name="slug" value={slug} />
      {/* Lets password managers save one password per entity. */}
      <input className="sr" type="text" name="username" value={slug} autoComplete="username" readOnly tabIndex={-1} aria-hidden="true" />
      <label htmlFor="password">Password for {name}</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={200}
        autoFocus
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "login-error" : undefined}
      />
      {state.error ? (
        <p className="login-error" id="login-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
