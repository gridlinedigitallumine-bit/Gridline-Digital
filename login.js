(() => {
  const $ = id => document.getElementById(id);
  const status = $('status');
  const loginForm = $('loginForm');
  const resetForm = $('resetForm');
  const emailInput = $('email');
  const passwordInput = $('password');
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  const recoveryToken = hash.get('access_token') || '';
  const recoveryMode = params.get('recovery') === '1' && hash.get('type') === 'recovery' && !!recoveryToken;
  const nextPath = ['/admin', '/admin.html'].includes(params.get('next')) ? params.get('next') : '/admin';

  if (recoveryToken) history.replaceState(null, '', location.pathname + location.search);

  const message = text => { status.textContent = text; };
  const send = async (path, payload) => {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The request could not be completed. Please try again.');
    return data;
  };

  if (recoveryMode) {
    $('heading').textContent = 'Choose a new password';
    $('lead').textContent = 'Set a strong new password for your administrator account.';
    loginForm.hidden = true;
    $('forgotPassword').hidden = true;
    resetForm.hidden = false;
    $('newPassword').focus();
  } else if (hash.get('error_description')) {
    history.replaceState(null, '', location.pathname + location.search);
    message('That recovery link is invalid or expired. Request a new password recovery email.');
  } else if (params.get('error') === 'not_admin') {
    message('This account does not have administrator access. Contact the site owner.');
  } else if (params.get('password') === 'updated') {
    message('Password updated. Sign in with your new password.');
    history.replaceState(null, '', location.pathname);
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const button = $('signIn');
    button.disabled = true;
    message('Signing in…');
    try {
      await send('/api/auth/login', { email: emailInput.value, password: passwordInput.value });
      location.assign(nextPath);
    } catch (error) {
      message(error.message);
      button.disabled = false;
    }
  });

  $('forgotPassword').addEventListener('click', async () => {
    if (!emailInput.value.trim()) {
      message('Enter your administrator email address first.');
      emailInput.focus();
      return;
    }
    const button = $('forgotPassword');
    button.disabled = true;
    message('Requesting a recovery email…');
    try {
      const data = await send('/api/auth/recover', { email: emailInput.value });
      message(data.message);
    } catch (error) {
      message(error.message);
    } finally {
      button.disabled = false;
    }
  });

  resetForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!resetForm.reportValidity()) return;
    const button = $('savePassword');
    button.disabled = true;
    message('Updating your password…');
    try {
      await send('/api/auth/update-password', { accessToken: recoveryToken, password: $('newPassword').value });
      history.replaceState(null, '', location.pathname);
      resetForm.hidden = true;
      loginForm.hidden = false;
      $('heading').textContent = 'Admin sign in';
      $('lead').textContent = 'Sign in with your invited administrator account to open the dashboard.';
      message('Password updated. Sign in with your new password.');
    } catch (error) {
      message(error.message);
      button.disabled = false;
    }
  });

  if (params.get('logout') === '1') {
    loginForm.hidden = true;
    $('forgotPassword').hidden = true;
    message('Signing out…');
    send('/api/auth/logout', {}).catch(() => {}).finally(() => {
      history.replaceState(null, '', location.pathname);
      loginForm.hidden = false;
      $('forgotPassword').hidden = false;
      message('You are signed out.');
    });
  }
})();
