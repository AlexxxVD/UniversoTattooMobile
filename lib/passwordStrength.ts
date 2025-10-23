export type PasswordChecks = {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
};

export function getPasswordStrength(password: string) {
  const checks: PasswordChecks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const strength = (passed / 5) * 100;
  return { strength, checks };
}