# L'Heure du Crime — Console du Meneur de Jeu

Compagnon web (100 % navigateur, aucune donnée envoyée) pour animer **L'Heure du Crime**,
une murder party d'enquête victorienne pour 8 à 20 joueurs.

👉 **Application en ligne : https://sebplace.github.io/lheure-du-crime/**

## Ce que fait la console

- **Composer la table** — saisissez le nombre de convives : répartition des camps (Enquêteurs /
  Malfaiteurs / Intrigants), nombre de tours et d'Actes d'accusation, carte d'équilibrage
  recommandée, et le conseil « Corbeau » pour les tables débutantes.
- **Bâtir un Cercle** — chargez l'un des trois scénarios d'initiation, **ou** cochez les
  personnages présents et laissez la console **isoler un Cercle de trois suspects** sur les
  traits publics (le vrai moteur de constructibilité du jeu, porté en JavaScript). Elle vous
  donne les Indices à révéler et l'alignement Secrets / Rumeurs.
- **Mener la partie** — check-list d'ouverture, compteurs d'Actes et de tours, ordre de
  résolution de la boîte à requêtes, rappel du second meurtre / Fantôme et des conditions de
  victoire.
- **Aide-mémoire** — les garde-fous du jeu, la règle de l'entonnoir, l'alignement des Secrets,
  et les curseurs de difficulté avancée.

## Le jeu

L'Heure du Crime repose sur un **deck universel** : 40 personnages, des Indices publics, des
Atouts, des Alibis, et le système **Secrets / Rumeurs** (l'entonnoir privé). Le Meneur de Jeu
sculpte un Cercle différent à chaque partie — la console est là pour l'y aider.

Règles complètes, Livre du Meneur de Jeu et scénarios : voir le jeu physique.

## Technique

Site statique : `index.html` + `style.css` + `app.js` + `data.json`. Aucune dépendance, aucun
backend. Déployable tel quel sur GitHub Pages.

## Licence

© Sébastien Place. Tous droits réservés.
