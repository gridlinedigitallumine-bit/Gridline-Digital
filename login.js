(() => {
  const status = document.getElementById('status');
  const signInButton = document.getElementById('signIn');
  const forgotButton = document.getElementById('forgotPassword');

  status.textContent = 'Admin sign-in is not configured yet. The site owner must connect Supabase Auth and invite the administrator before dashboard access is available.';
  signInButton.disabled = true;
  forgotButton.disabled = true;
})();
