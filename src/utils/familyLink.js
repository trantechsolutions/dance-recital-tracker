// The link admins share with families. Carrying the studio code in `?code=`
// means families who open it only have to sign in (App.jsx stores the code and
// submits it for them once they're signed in).
export const familyLink = (code) => {
  const base = window.location.origin + window.location.pathname.replace(/\/admin.*$/, '/');
  return code ? `${base}?code=${encodeURIComponent(code)}` : base;
};
