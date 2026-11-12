/* Voyazia — authentification (Firebase Auth) + carnet synchronisé (Firestore, sans SQL).
   Chargé après le script principal, config.js et les SDK Firebase. Sans config, le mode démo local reste actif. */
(function () {
  const C = (window.VOYAZIA || {}).firebase || {};
  if (!C.apiKey || !C.projectId || typeof firebase === "undefined" || typeof D === "undefined") {
    console.warn("Voyazia : Firebase non configuré (config.js) — mode démo local conservé.");
    return;
  }
  firebase.initializeApp(C);
  const auth = firebase.auth(), db = firebase.firestore();
  const AX = {
    fr: { in: "Connexion", up: "Inscription", sub_in: "Retrouve ton carnet de voyage sur tous tes appareils.", sub_up: "Gratuit. Ton carnet, tes favoris et tes envies sont sauvegardés.", name: "Prénom", email: "E-mail", pw: "Mot de passe", hint: "8 caractères minimum", go_in: "Se connecter", go_up: "Créer mon compte", forgot: "Mot de passe oublié ?", send: "Envoyer le lien", back: "← Retour", show: "Afficher", close: "Fermer", t_forgot: "Réinitialiser le mot de passe", e_name: "Indique ton prénom.", e_mail: "Adresse e-mail invalide.", e_pw: "Le mot de passe doit faire au moins 8 caractères.", e_cred: "E-mail ou mot de passe incorrect.", e_unconf: "Ton e-mail n'est pas encore confirmé. Un nouvel e-mail de confirmation vient d'être envoyé.", e_exists: "Un compte existe déjà avec cet e-mail.", e_rate: "Trop de tentatives, réessaie dans quelques minutes.", e_net: "Connexion impossible, vérifie ta connexion internet.", e_gen: "Une erreur est survenue, réessaie.", ok_up: "Compte créé ! Clique sur le lien reçu par e-mail pour confirmer ton adresse (pense aux spams), puis connecte-toi.", ok_reset: "Si un compte existe avec cet e-mail, un lien de réinitialisation vient d'être envoyé.", legal: "En créant un compte, tu acceptes les <a href=\"mentions-legales.html#donnees\" target=\"_blank\">mentions légales et la politique de confidentialité</a>.", foot: "Voyazia · comptes sécurisés, carnet synchronisé sur tous tes appareils. Descriptions et meilleurs moments pour 168 pays (les territoires disputés ou inhabités n'ont qu'un nom)." },
    en: { in: "Sign in", up: "Sign up", sub_in: "Find your travel journal on all your devices.", sub_up: "Free. Your journal, favorites and wishlist are saved.", name: "First name", email: "Email", pw: "Password", hint: "8 characters minimum", go_in: "Sign in", go_up: "Create my account", forgot: "Forgot password?", send: "Send link", back: "← Back", show: "Show", close: "Close", t_forgot: "Reset your password", e_name: "Enter your first name.", e_mail: "Invalid email address.", e_pw: "Password must be at least 8 characters.", e_cred: "Incorrect email or password.", e_unconf: "Your email is not confirmed yet. A new confirmation email has just been sent.", e_exists: "An account already exists with this email.", e_rate: "Too many attempts, try again in a few minutes.", e_net: "Can't connect, check your internet connection.", e_gen: "Something went wrong, please retry.", ok_up: "Account created! Click the link sent to your email to confirm (check spam), then sign in.", ok_reset: "If an account exists for this email, a reset link has just been sent.", legal: "By creating an account you accept the <a href=\"mentions-legales.html#donnees\" target=\"_blank\">legal notice and privacy policy</a> (in French).", foot: "Voyazia · secure accounts, journal synced across your devices. Descriptions and best times for 168 countries (disputed or uninhabited territories show a name only)." },
    es: { in: "Acceso", up: "Registro", sub_in: "Recupera tu diario de viaje en todos tus dispositivos.", sub_up: "Gratis. Tu diario, favoritos y deseos se guardan.", name: "Nombre", email: "Correo", pw: "Contraseña", hint: "Mínimo 8 caracteres", go_in: "Iniciar sesión", go_up: "Crear mi cuenta", forgot: "¿Olvidaste tu contraseña?", send: "Enviar enlace", back: "← Volver", show: "Mostrar", close: "Cerrar", t_forgot: "Restablecer contraseña", e_name: "Indica tu nombre.", e_mail: "Correo no válido.", e_pw: "La contraseña debe tener al menos 8 caracteres.", e_cred: "Correo o contraseña incorrectos.", e_unconf: "Tu correo aún no está confirmado. Se acaba de enviar un nuevo correo de confirmación.", e_exists: "Ya existe una cuenta con este correo.", e_rate: "Demasiados intentos, inténtalo en unos minutos.", e_net: "Sin conexión, revisa tu internet.", e_gen: "Ha ocurrido un error, inténtalo de nuevo.", ok_up: "¡Cuenta creada! Haz clic en el enlace del correo para confirmar (revisa el spam) y luego inicia sesión.", ok_reset: "Si existe una cuenta con este correo, se ha enviado un enlace de restablecimiento.", legal: "Al crear una cuenta aceptas el <a href=\"mentions-legales.html#donnees\" target=\"_blank\">aviso legal y la política de privacidad</a> (en francés).", foot: "Voyazia · cuentas seguras, diario sincronizado en todos tus dispositivos. Descripciones y mejores épocas para 168 países (los territorios en disputa o deshabitados solo muestran el nombre)." }
  };
  const A = k => (AX[L] || AX.fr)[k];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clean = a => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === "string" && /^[A-Z]{2}$/.test(x)))] : [];
  let uid = null, pulled = null, timer = null, pendingCb = null, welcome = false;

  // ---- données : cache local par compte + synchro Firestore
  const lk = () => "vz_d_" + uid;
  const ref = () => db.collection("voyazia").doc(uid);
  window.load = function () { st = { v: [], f: [], w: [] }; if (!uid) return; try { st = Object.assign(st, JSON.parse(localStorage.getItem(lk()) || "{}")); } catch (e) {} };
  window.save = function () { try { localStorage.setItem(lk(), JSON.stringify(st)); } catch (e) { toast(t("saveFail")); } push(); };
  function push() {
    if (!uid || pulled !== uid) return;
    clearTimeout(timer);
    timer = setTimeout(() => ref().set({ v: st.v, f: st.f, w: st.w, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(e => { console.error(e); toast(t("saveFail")); }), 400);
  }
  async function pull() {
    try {
      const snap = await ref().get();
      pulled = uid;
      if (snap.exists) { const d = snap.data(); st = { v: clean(d.v), f: clean(d.f), w: clean(d.w) }; try { localStorage.setItem(lk(), JSON.stringify(st)); } catch (e) {} }
      else push();
    } catch (e) { console.error(e); toast(t("saveFail")); return; }
    refresh(); if (cur) panel(cur);
  }

  // ---- état de session (seuls les comptes à e-mail confirmé sont connectés)
  async function handle(u) {
    if (u && u.emailVerified) {
      const changed = uid !== u.uid;
      uid = u.uid; user = u.displayName || (u.email || "").split("@")[0] || "user";
      if (changed) {
        load(); refresh(); await pull();
        if (welcome || pendingCb) toast(t("welcome") + user + " !");
        welcome = false;
        if (pendingCb) { const f = pendingCb; pendingCb = null; f(); }
      } else refresh();
    } else if (!u) {
      const was = uid; uid = null; user = null; pulled = null; st = { v: [], f: [], w: [] };
      refresh(); if (cur) panel(cur); if (was) toast(t("bye"));
    }
  }
  auth.onAuthStateChanged(handle);

  // ---- interface
  const css = document.createElement("style");
  css.textContent = `
#authDlg{padding:0;max-width:420px}
.auth{padding:24px;display:grid;gap:12px}
.auth h3{font-size:22px}.auth p{margin:0;color:var(--slate);font-size:14px}
.auth .tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:var(--bg);padding:4px;border-radius:14px}
.auth .tabs button{border:0;background:none;color:var(--slate);padding:9px;border-radius:10px;font-weight:700}
.auth .tabs button.on{background:var(--card);color:var(--ink);box-shadow:0 2px 8px #10305c1f}
.auth form{display:grid;gap:10px}
.auth label{display:grid;gap:4px;font-size:12px;font-weight:700;color:var(--slate)}
.auth input{margin:0;width:100%}
.auth .pw{display:flex;gap:6px}.auth .pw button{white-space:nowrap}
.auth .lnk{border:0;background:none;color:var(--royal);font-weight:700;padding:0;text-align:left;font-size:13px}
.auth .m{font-size:13px;border-radius:12px;padding:10px 12px;display:none}
.auth .m.err{display:block;background:#fee2e2;color:#991b1b}.auth .m.ok{display:block;background:#dcfce7;color:#166534}
.auth .btn[disabled]{opacity:.6;cursor:wait}`;
  document.head.appendChild(css);
  const dlg = document.createElement("dialog"); dlg.id = "authDlg"; document.body.appendChild(dlg);

  function openAuth(mode) { view(mode); if (!dlg.open) dlg.showModal(); }
  function view(mode) {
    const tabs = mode === "in" || mode === "up";
    const pwField = (lab, ac) => `<label>${lab}<div class="pw"><input name="pw" type="password" autocomplete="${ac}" required><button type="button" class="btn ghost sm" data-show>${A("show")}</button></div></label>`;
    const fields = { in: `<label>${A("email")}<input name="email" type="email" autocomplete="email" required></label>${pwField(A("pw"), "current-password")}`,
      up: `<label>${A("name")}<input name="name" maxlength="30" autocomplete="given-name" required></label><label>${A("email")}<input name="email" type="email" autocomplete="email" required></label>${pwField(A("pw") + " · " + A("hint"), "new-password")}`,
      forgot: `<label>${A("email")}<input name="email" type="email" autocomplete="email" required></label>` }[mode];
    const go = { in: A("go_in"), up: A("go_up"), forgot: A("send") }[mode];
    dlg.innerHTML = `<div class="auth">${tabs ? `<div class="tabs"><button class="${mode === "in" ? "on" : ""}" data-mode="in">${A("in")}</button><button class="${mode === "up" ? "on" : ""}" data-mode="up">${A("up")}</button></div><p>${mode === "in" ? A("sub_in") : A("sub_up")}</p>` : `<h3>${A("t_forgot")}</h3>`}
<form novalidate>${fields}<div class="m" role="alert"></div><button class="btn" type="submit">${go}</button></form>${mode === "up" ? `<p style="font-size:12px">${A("legal")}</p>` : ""}
${mode === "in" ? `<button class="lnk" data-mode="forgot">${A("forgot")}</button>` : ""}${mode === "forgot" ? `<button class="lnk" data-mode="in">${A("back")}</button>` : ""}
<button class="btn ghost sm" data-close>${A("close")}</button></div>`;
    const f = dlg.querySelector("form"); f.onsubmit = e => { e.preventDefault(); submit(mode, f); };
    dlg.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => view(b.dataset.mode));
    dlg.querySelector("[data-close]").onclick = () => dlg.close();
    dlg.querySelectorAll("[data-show]").forEach(b => b.onclick = () => { const i = b.previousElementSibling; i.type = i.type === "password" ? "text" : "password"; });
    const first = f.querySelector("input"); if (first && dlg.open) first.focus();
  }
  const say = (k, h) => { const m = dlg.querySelector(".m"); if (m) { m.className = "m " + k; m.innerHTML = h; } };
  function fail(e) {
    const c = e.code || "";
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password", "auth/invalid-login-credentials"].includes(c)) return say("err", esc(A("e_cred")));
    if (c === "auth/email-already-in-use") return say("err", esc(A("e_exists")));
    if (c === "auth/weak-password") return say("err", esc(A("e_pw")));
    if (c === "auth/invalid-email") return say("err", esc(A("e_mail")));
    if (c === "auth/too-many-requests") return say("err", esc(A("e_rate")));
    if (c === "auth/network-request-failed") return say("err", esc(A("e_net")));
    console.error(e); say("err", esc(A("e_gen")));
  }
  async function submit(mode, f) {
    const v = n => (f.elements[n] ? f.elements[n].value : ""), email = v("email").trim(), pw = v("pw"), name = v("name").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say("err", esc(A("e_mail")));
    if (mode === "up" && !name) return say("err", esc(A("e_name")));
    if (mode === "up" && pw.length < 8) return say("err", esc(A("e_pw")));
    if (mode === "in" && !pw) return say("err", esc(A("e_cred")));
    const btn = f.querySelector("[type=submit]"); btn.disabled = true;
    auth.languageCode = L;
    try {
      if (mode === "in") {
        const { user: u } = await auth.signInWithEmailAndPassword(email, pw);
        if (!u.emailVerified) { await u.sendEmailVerification().catch(() => {}); await auth.signOut(); return say("err", esc(A("e_unconf"))); }
        welcome = true; dlg.close();
      } else if (mode === "up") {
        const { user: u } = await auth.createUserWithEmailAndPassword(email, pw);
        await u.updateProfile({ displayName: name });
        await u.sendEmailVerification();
        await auth.signOut();
        say("ok", esc(A("ok_up")));
      } else {
        try { await auth.sendPasswordResetEmail(email); } catch (e) { if (e.code !== "auth/user-not-found") return fail(e); }
        say("ok", esc(A("ok_reset")));
      }
    } catch (e) { fail(e); }
    finally { btn.disabled = false; }
  }

  window.login = cb => { pendingCb = cb || null; openAuth("in"); };
  $("#loginBtn").onclick = () => { if (uid) auth.signOut(); else window.login(); };
  ["fr", "en", "es"].forEach(l => T[l].foot = AX[l].foot);
  applyLang();
})();
