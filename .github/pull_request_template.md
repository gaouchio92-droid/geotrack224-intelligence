## Résumé des changements

<!-- Décrivez brièvement ce que cette PR modifie et pourquoi. -->



## Type de changement

<!-- Cochez toutes les cases qui s'appliquent. -->

- [ ] Correction de bug
- [ ] Nouvelle fonctionnalité
- [ ] Refactoring (aucun changement fonctionnel)
- [ ] Mise à jour de dépendances
- [ ] Documentation / configuration

## Changements notables

<!-- Listez les fichiers ou modules principaux touchés et ce qui a changé. -->

-
-

## Tests effectués

<!-- Décrivez comment vous avez vérifié que vos changements fonctionnent correctement. -->

- [ ] `pnpm run typecheck` passe sans erreur
- [ ] L'API répond correctement aux routes modifiées (testé via curl ou les hooks générés)
- [ ] Le frontend s'affiche correctement et les flux utilisateur concernés fonctionnent
- [ ] Le simulateur GPS et le WebSocket continuent de fonctionner (si applicable)
- [ ] Aucune régression visible sur les pages non modifiées

## Captures d'écran (si applicable)

<!-- Ajoutez des captures d'écran pour les changements visuels (dashboard, carte, alertes, etc.). -->



## Points d'attention pour les reviewers

<!-- Y a-t-il des compromis, des décisions d'architecture ou des zones de risque à signaler ? -->



## Checklist finale

- [ ] Le code respecte les conventions du projet (pas de `console.log` côté serveur, imports Zod v3, etc.)
- [ ] Les fichiers générés par Orval (`lib/api-zod/`, `lib/api-client-react/`) sont à jour si l'OpenAPI spec a changé
- [ ] `replit.md` est mis à jour si l'architecture ou les fonctionnalités ont évolué
- [ ] Aucune clé ou secret n'est introduit en dur dans le code
