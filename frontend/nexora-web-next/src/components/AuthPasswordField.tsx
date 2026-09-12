"use client";

import { useState } from "react";
import styles from "./ProductFeedback.module.css";

export default function AuthPasswordField({ mode }: { mode: "login" | "register" }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-form__field">
      <label htmlFor={`${mode}-password`}>Password</label>
      <div className={styles.password}>
        <input id={`${mode}-password`} name="password" type={visible ? "text" : "password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
          minLength={mode === "register" ? 8 : undefined} maxLength={72}
          aria-describedby={mode === "register" ? "register-password-hint" : undefined} required />
        <button type="button" aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={`${mode}-password`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {mode === "register" ? <small className="ux-helper" id="register-password-hint">Use 8–72 characters; emoji and some letters reduce the maximum. Spaces alone are not a password.</small> : null}
    </div>
  );
}
