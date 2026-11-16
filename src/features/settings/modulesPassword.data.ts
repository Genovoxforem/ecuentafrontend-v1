// "Login for Modules": the classic admin/modules.php asks for a password before it shows the module list (field pas_Name, kept in the PHP session).
// The key-authenticated API has no such check yet (master row AN-210: admin/fapi/modules.php answers the full list without a password).
//
// PENDING BACKEND: until AN-210 is built this function cannot verify anything, so the dialog UI only asks for a non-empty value and lets it through.
// When the backend adds the verify action, replace the body below with that call (and set MODULES_PASSWORD_CHECK_WIRED to true); the dialog does not change.
export const MODULES_PASSWORD_CHECK_WIRED = false

export async function verifyModulesPassword(password: string): Promise<boolean> {
  return password.trim().length > 0
}
