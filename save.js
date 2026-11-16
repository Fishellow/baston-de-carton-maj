/* Où le jeu range ses sauvegardes (profil, pseudo, decks, réglages, volumes).
   Dans le jeu installé : un vrai fichier (sauvegarde.json dans le dossier de l'utilisateur), écrit tout de suite à chaque changement,
   donc rien ne se perd si on ferme la fenêtre juste après. Dans un navigateur (tests) : la mémoire du navigateur.
   Au premier lancement, l'ancienne sauvegarde du navigateur est reprise automatiquement. */
const STORE = (function () {
  const f = window.BDC && BDC.store;
  return {
    get(k) { try { if (f) { let v = f.get(k); if (v == null) { v = localStorage.getItem(k); if (v != null) f.set(k, v); } return v; } return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (f) f.set(k, v); localStorage.setItem(k, v); } catch (e) { } },
    del(k) { try { if (f) f.set(k, null); localStorage.removeItem(k); } catch (e) { } },
  };
})();
