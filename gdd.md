# Zombie Hunter — Document de Conception

## Vision du Jeu

Zombie Hunter est un shooter top-down nerveux et addictif où le joueur incarne un survivant piégé dans une grande salle assiégée par des hordes de morts-vivants. Armé jusqu'aux dents, il devra exploiter chaque recoin de l'environnement — colonnes, murets, mobilier — pour survivre à des vagues toujours plus intenses. Le jeu mise sur une boucle de gameplay serrée : tirer, esquiver, se repositionner, upgrader, recommencer.

L'expérience se veut accessible mais profonde, avec une difficulté progressive qui récompense autant les réflexes que la stratégie de positionnement.

---

## L'Arène de Survie

### Anatomie d'une salle

Chaque niveau se déroule dans une grande pièce rectangulaire ou irrégulière, parsemée d'éléments de terrain qui transforment l'espace en véritable champ de bataille tactique.

Les **portes** constituent les points de spawn des zombies. Réparties sur les murs périphériques, elles s'activent progressivement au fil des vagues. Une porte inactive reste fermée ; une porte active pulse d'une lueur rougeâtre inquiétante avant de libérer ses occupants. Le joueur peut investir des ressources pour barricader temporairement une porte ou y installer un piège qui endommagera les zombies à leur entrée.

Les **colonnes et piliers** offrent des points de cover solides. Le joueur peut s'y adosser pour bloquer la ligne de vue de certains ennemis ou créer des goulots d'étranglement. Ces structures sont indestructibles et constituent les points d'ancrage de toute stratégie défensive.

Les **murets et demi-murs** procurent une couverture partielle. Le joueur peut tirer par-dessus, mais les zombies finiront par les contourner ou, pour les plus costauds, les détruire. Ils permettent de gagner du temps, pas d'établir une forteresse.

Le **mobilier destructible** — tables renversées, étagères, caisses — peut servir de couverture temporaire ou être délibérément détruit pour dégager une ligne de tir. Certains meubles contiennent des bonus cachés qui se libèrent à leur destruction.

Les **zones de terrain** modifient la mobilité : flaques d'eau ou de sang qui ralentissent, gravats qui réduisent la vitesse, zones électrifiées qui infligent des dégâts périodiques. Ces zones affectent autant le joueur que les zombies, créant des opportunités tactiques.

Les **éléments interactifs** ajoutent une dimension environnementale au combat : barils explosifs placés stratégiquement, interrupteurs qui activent des pièges (lames rotatives, jets de flammes, portes coulissantes), générateurs qui peuvent être sabotés pour créer des zones électrifiées.

### Variation des environnements

L'arène change d'un niveau à l'autre, chaque setting apportant son ambiance et ses particularités de level design :

Le **hall d'hôpital abandonné** offre de longs corridors entre les piliers, des lits renversables comme couverture mobile, et une lumière blafarde qui clignote lors des vagues intenses.

Le **centre commercial dévasté** propose des espaces plus ouverts avec des îlots de comptoirs et présentoirs, des escalators immobiles servant de rampes tactiques, et des mannequins qui peuvent être confondus avec des zombies dans la panique.

La **station de métro** joue sur l'étroitesse : quais parallèles, piliers massifs, rames de métro servant d'obstacles linéaires. Les zombies peuvent surgir des tunnels sombres aux extrémités.

Le **laboratoire secret** introduit l'élément narratif de l'origine du virus. Cuves brisées, équipement scientifique comme couverture, et zones de contamination qui buffent les zombies qui les traversent.

La **prison** maximise les choke points avec ses grilles et ses cellules. Le joueur peut verrouiller certaines portes temporairement, mais les zombies s'accumulent derrière jusqu'à défoncer le passage.

---

## L'Arsenal

### Philosophie des armes

Chaque arme occupe une niche tactique distincte. Le joueur ne transporte que deux armes à la fois (plus une arme de mêlée), ce qui force des choix stratégiques. Les munitions sont limitées mais généreuses : assez pour ne pas frustrer, pas assez pour ignorer la gestion.

### Armes à feu conventionnelles

Le **pistolet** accompagne le joueur dès le début. Fiable, précis, munitions abondantes. Il évolue vers le double-pistolet (cadence doublée), puis vers les pistolets akimbo à balles perforantes capables de traverser plusieurs ennemis alignés.

Le **shotgun** excelle dans les espaces confinés et contre les groupes serrés. Son spread initial étroit s'élargit avec les upgrades, jusqu'à la variante incendiaire qui laisse des traînées de feu au sol.

La **mitraillette** offre un volume de feu continu idéal pour les vagues denses. Elle devient minigun, puis minigun à munitions explosives dont chaque balle génère un micro-impact de zone.

Le **fusil de précision** permet d'éliminer les menaces prioritaires à distance — les Screamers et les Necromancers — avant qu'ils n'atteignent la mêlée. Dégâts massifs, cadence lente, récompense la visée.

### Armes spécialisées

Le **lance-flammes** crée des zones de déni persistantes. Le feu reste au sol plusieurs secondes, idéal pour bloquer une porte ou protéger un flanc. Les zombies en feu continuent d'avancer mais meurent rapidement.

Le **canon Tesla** libère un arc électrique qui saute automatiquement d'ennemi en ennemi. Parfait contre les hordes serrées, moins efficace contre les cibles isolées. L'électricité se propage via les flaques d'eau.

Le **fusil à clous** empale les zombies au sol ou aux murs, les immobilisant temporairement. Ne tue pas directement mais permet de contrôler le flux d'ennemis et de gagner du temps pour recharger.

L'**arc composite** sacrifie la cadence pour la discrétion : les tirs n'attirent pas l'attention des zombies des portes inactives. Idéal pour gérer chirurgicalement une menace sans déclencher une cascade de spawns.

Le **canon à micro-ondes** fait littéralement exploser les zombies de l'intérieur après une courte charge. Dégâts en cône, satisfaisant visuellement, mais le temps de charge expose le joueur.

### Armes de mêlée

Toujours disponible en dernier recours, l'arme de mêlée ne consomme pas de munitions mais expose le joueur au danger.

La **batte de baseball** offre un bon équilibre portée/vitesse, avec une chance de repousser les ennemis.

La **machette** frappe plus vite avec moins de portée, idéale pour se dégager rapidement.

La **tronçonneuse** dévaste tout sur son passage mais ralentit le joueur pendant l'utilisation. Elle consomme du carburant, ressource rare.

---

## Le Bestiaire

### Les zombies communs

Le **Shambler** constitue la chair à canon des premières vagues. Lent, fragile, prévisible. Sa force réside dans le nombre : une douzaine de Shamblers peut submerger un joueur mal positionné.

Le **Runner** compense sa fragilité par sa vitesse. Il fonce en ligne droite vers le joueur, parfait pour déborder les positions défensives établies derrière les colonnes. Priorité moyenne.

Le **Crawler** rampe au sol, difficile à repérer dans le chaos. Il surgit souvent des angles morts, passant sous les lignes de tir concentrées sur les menaces debout. Son attaque surprise inflige des dégâts et un effet de sursaut qui désoriente brièvement le joueur.

### Les zombies spécialisés

Le **Tank** absorbe une quantité massive de dégâts et repousse violemment le joueur au contact. Il avance lentement mais inexorablement, détruisant les couvertures destructibles sur son passage. Exige une concentration de feu ou des armes lourdes.

Le **Spitter** reste en retrait et crache des projectiles de bile acide. Il force le joueur à quitter sa couverture pour l'éliminer, créant des fenêtres de vulnérabilité. La bile laisse des flaques corrosives au sol.

Le **Bomber** explose à sa mort, infligeant des dégâts de zone importants. L'astuce consiste à le tuer au milieu d'un groupe d'autres zombies pour un effet de réaction en chaîne, mais loin de soi.

Le **Screamer** représente une menace prioritaire absolue. Son hurlement accélère et enrage tous les zombies à portée. Non éliminé rapidement, il transforme une vague gérable en catastrophe. Reconnaissable à sa posture et à son inspiration avant le cri.

Le **Splitter** se divise en deux ou trois petits zombies rapides à sa mort. Il faut prévoir les munitions pour finir le travail et éviter de le tuer dans un espace confiné où les petits zombies coinceront le joueur.

L'**Invisible** n'apparaît que comme une distorsion visuelle subtile jusqu'à ce qu'il soit très proche. Les flaques révèlent sa position (éclaboussures), de même que le feu et l'électricité. Excellent pour maintenir la tension et la paranoïa.

Le **Necromancer** ressuscite les cadavres de zombies dans un rayon autour de lui. Chaque zombie tué peut revenir si le Necromancer n'est pas éliminé rapidement. Il reste en retrait et fuit le joueur, exigeant une chasse active.

### Les boss

Un boss apparaît toutes les cinq vagues environ. Son entrée est cinématique : il défonce une porte, la détruisant définitivement et créant un nouveau point de spawn permanent. Cela force une adaptation stratégique constante.

L'**Abomination** fusionne plusieurs corps en une masse de chair immense. Elle charge le joueur, détruisant tout obstacle sur son passage, et libère des parasites (mini-zombies) quand elle subit des dégâts. Sa faiblesse : les multiples têtes qui dépassent de son corps, cibles critiques.

Le **Patient Zéro** ressemble presque à un humain, rapide et intelligent. Il esquive les tirs, utilise les couvertures, et commande les autres zombies qui deviennent coordonnés en sa présence. Le tuer désorganise temporairement toute la horde.

Le **Colosse Blindé** porte des débris comme armure. Seules les armes perforantes ou explosives l'endommagent initialement ; il faut d'abord détruire son armure pièce par pièce pour révéler ses points faibles.

---

## Les Survivants Jouables

Chaque personnage offre un style de jeu distinct, encourageant la rejouabilité et l'expérimentation.

### Le Flic

Marcus Webb, officier de police au moment de l'épidémie, reste calme sous la pression. Son entraînement au tir lui confère un **bonus de précision** passif et une chance de **tir critique** sur chaque balle. Il commence avec un revolver puissant plutôt que le pistolet standard. Sa compétence active, **Concentration**, ralentit le temps perçu pendant quelques secondes, permettant un repositionnement tactique ou l'élimination précise de menaces prioritaires.

### La Médecin

Dr. Elena Vasquez travaillait au laboratoire où tout a commencé. Elle bénéficie d'une **régénération passive** lente mais constante, et tous les soins ramassés sont **50% plus efficaces** pour elle. Sa compétence active, **Vaccination**, la rend temporairement immune aux infections et aux effets de statut (ralentissement, poison). Elle peut également stabiliser des PNJ blessés dans les missions de sauvetage.

### Le Mécano

Frank "Gears" Morrison sait faire parler les machines. Il pose des **tourelles automatiques** comme compétence active — des sentinelles temporaires qui couvrent un angle. Ses armes improvisées et explosives infligent des **dégâts bonus**, et il répare les barricades plus vite. Style de jeu défensif et territorial.

### L'Athlète

Jade Chen, coureuse professionnelle, mise tout sur la mobilité. Sa **vitesse de déplacement** est supérieure de 20%, son **dash d'esquive** couvre plus de distance, et ses attaques de mêlée sont plus rapides. Sa compétence active, **Sprint**, booste temporairement sa vitesse et la rend intangible pendant un bref instant. Elle excelle à kiter les hordes et à éviter les boss.

### Le Pyromane

Victor Ash, pompier devenu ironiquement obsédé par le feu. Il est **résistant au feu** (le sien et celui de l'environnement), inflige des **dégâts bonus avec les armes incendiaires**, et les ennemis qu'il tue ont une chance de s'enflammer et de propager l'incendie. Sa compétence active, **Nova**, libère une explosion de flammes autour de lui, idéale quand il est submergé.

### La Gamine

Lily, douze ans, survit grâce à son instinct et son compagnon. Sa **hitbox réduite** la rend plus difficile à toucher, et son chien Max attaque automatiquement les zombies proches, offrant un DPS passif et une alerte précoce contre les Crawlers et Invisibles. Sa compétence active, **Flair**, révèle tous les ennemis à l'écran pendant quelques secondes et met en évidence les bonus cachés. Style de jeu nerveux et évasif.

---

## Progression et Économie

### Pendant une partie

Chaque zombie éliminé rapporte des **points** et a une chance de lâcher un **drop** : munitions, soins, ou power-up temporaire.

Entre les vagues, le joueur accède à un **menu d'amélioration** de style roguelite : trois options aléatoires parmi lesquelles il doit en choisir une. Ces options incluent des améliorations d'armes, des bonus passifs (vitesse, dégâts, armure), ou des capacités utilitaires (portée de ramassage, durée des power-ups).

Les points accumulés peuvent également être dépensés dans un **menu tactique** pour barricader une porte, poser un piège, acheter des munitions ou des soins.

### Le système de combo

Un **multiplicateur de combo** augmente avec chaque kill enchaîné et redescend si le joueur passe trois secondes sans éliminer d'ennemi. Un combo élevé améliore les points gagnés et la qualité des drops. Cette mécanique récompense l'agressivité calculée : rester planqué derrière une colonne casse le combo, mais foncer tête baissée mène à la mort.

### Entre les parties

L'expérience accumulée débloque progressivement de nouveaux personnages, armes de départ, et options de personnalisation. Un **arbre de progression permanente** offre des améliorations mineures mais cumulatives : santé de base, capacité de munitions, efficacité des power-ups. Les joueurs débloquent également de nouveaux environnements et modes de jeu.

---

## Power-ups et Objets

### Drops temporaires

Les power-ups offrent des buffs immédiats et temporaires :

**Rage** double les dégâts pendant dix secondes, transformant n'importe quelle arme en instrument de destruction massive.

**Freeze** ralentit drastiquement tous les ennemis à l'écran, offrant une fenêtre de respiration et de repositionnement.

**Ghost** rend le joueur intangible pendant cinq secondes. Il peut traverser les zombies sans subir de dégâts, idéal pour s'échapper d'un encerclement.

**Magnet** attire automatiquement tous les drops vers le joueur pendant sa durée, permettant de ramasser les ressources sans s'exposer.

**Nuke**, extrêmement rare, élimine instantanément tous les zombies présents à l'écran. Un reset salvateur quand tout semble perdu.

### Objets actifs

Le joueur peut transporter un objet actif à déclencher manuellement :

La **tourelle portable** tire automatiquement sur les ennemis proches pendant trente secondes. Positionnement stratégique crucial.

La **mine de proximité** s'enterre et explose au passage des zombies. Parfaite pour piéger une porte ou un couloir.

Le **drone d'attaque** survole le joueur et tire sur les ennemis pendant une durée limitée, offrant du DPS supplémentaire et un peu de répit.

Le **leurre holographique** attire les zombies vers une position fictive, permettant de les regrouper pour une attaque de zone ou simplement de gagner du temps.

La **grenade Disco Ball** attire tous les zombies proches vers son point d'impact avant d'exploser dans une gerbe de lumière et de destruction.

---

## Montée en Difficulté

### Progression des vagues

Les premières vagues n'activent que deux ou trois portes et n'envoient que des Shamblers et quelques Runners. Le joueur apprend l'environnement, teste ses armes, établit ses routes de kiting.

À mesure que les vagues progressent, davantage de portes s'activent, les spawns s'accélèrent, et de nouveaux types de zombies sont introduits. Chaque nouveau type bénéficie d'une introduction visuelle pour que le joueur comprenne la menace avant d'être submergé.

Les boss ponctuent la progression et modifient définitivement l'arène en détruisant des portes et parfois des éléments de terrain. L'espace sûr se réduit, les angles morts se multiplient.

### Événements spéciaux

Des **événements aléatoires** peuvent se déclencher pour pimenter une vague :

**Blackout** réduit drastiquement la visibilité. Seuls le joueur et les yeux lumineux des zombies percent l'obscurité. Le lance-flammes et le canon Tesla deviennent précieux pour leur éclairage incidentel.

**Horde** triple le nombre de spawns pour une vague, noyant l'écran sous les zombies. Survie pure.

**Porte Surchauffée** : une porte ignorée trop longtemps pulse dangereusement et libère un mini-boss si elle n'est pas barricadée ou purgée rapidement.

**Boss Rush** enchaîne plusieurs boss sans vague de répit entre eux. Test ultime.

---

## Philosophie d'Équilibrage

### Piliers d'Expérience (Framework MDA)

Le game design suit le framework MDA (Mechanics → Dynamics → Aesthetics) : les paramètres créent des dynamiques qui produisent l'expérience ressentie. Trois piliers guident l'équilibrage :

**Rythme Arcade** — Vagues rapides, décisions fréquentes, combos récompensés. Le joueur doit rester actif ; la passivité casse le combo et réduit les récompenses.

**Tension Lisible** — On "voit venir" le danger (télégraphie des attaques, audio cues, wind-up animations). Le jeu peut être difficile tout en restant perçu comme fair. Un ennemi juste est un ennemi prévisible.

**Variété Tactique** — Chaque type de zombie impose un micro-problème distinct. Le joueur doit adapter sa stratégie selon la composition de la vague.

### Métriques Dérivées

Les stats brutes (HP, speed, damage) sont insuffisantes pour l'équilibrage. Le jeu calcule des indicateurs dérivés :

**Armes :**
- **DPS brut** : `damage / fireRate` — Dégâts par seconde en tir continu
- **DPS soutenu** : Prend en compte le temps de rechargement et la taille du chargeur. C'est la métrique réelle de puissance.
- **Temps pour vider** : `magazineSize × fireRate`
- **Cycle complet** : `tempsVider + reloadTime`

**Zombies :**
- **TTK (Time-to-Kill)** : `zombieHP / sustainedDPS(arme)` — Temps pour éliminer un zombie avec une arme donnée
- **TTC (Time-to-Contact)** : `distance / zombieSpeed` — Temps avant que le zombie atteigne le joueur
- **DPS reçu** : `zombieDamage / attackCooldown` — Dégâts par seconde si contact maintenu
- **Score de Menace** : `(DPS_reçu) × (1 / TTC)` — Ajusté par la difficulté d'esquive

**Joueur :**
- **EHP (Effective Health)** : Santé ajustée par invuln frames, dash, mobilité
- **Survivabilité** : Compare les dégâts entrants vs capacité d'évitement

### Système de Budget de Menace

Au lieu de compter simplement les zombies par vague, le système utilise un **budget de menace** :

1. Chaque zombie a un **coût** basé sur son TTK, TTC et score de menace
2. Chaque vague dispose d'un **budget** qui augmente progressivement
3. Le système "dépense" ce budget via spawn pondéré

**Contraintes de composition :**
- Maximum simultané par rôle (ex: max 1 tank, max 2 spitters actifs)
- Pacing (éviter 5 runners simultanés)
- Alternance "pic" / "respiration" pour le rythme

### Difficulté Adaptative (DDA)

Le jeu implémente une DDA légère pour maintenir le joueur en zone de flow (ni ennui, ni frustration).

**Métriques observées (fenêtre glissante 30-60s) :**
- `accuracy` : hits / shots
- `damageTakenPerMin` : dégâts subis
- `timeToClearWave` : efficacité de clear
- `nearDeaths` : passages sous 15% HP
- `dashUsage` : trop = panique, trop peu = trivial

**Leviers d'ajustement (safe) :**
- `spawnDelay` — Levier principal
- Composition (weights par type)
- Drop rate (munitions/soins) si applicable

**Règles de stabilité :**
- **Hysteresis** : Pas de changement toutes les 2 secondes
- **Bornes** : `spawnDelay ∈ [300..1300]` — Jamais hors limites
- **Transparence** : Option "Difficulté adaptative : ON/OFF" pour le joueur

### Règles de Fairness

**Lisibilité > Réalisme** — Chaque menace doit être visuellement et auditivement identifiable. Un joueur ne doit jamais mourir sans comprendre pourquoi.

**Éviter les Spikes Injustes** — Les pics de difficulté viennent souvent de combos (runner + spitter + invisible simultanés). Le budget de menace et les caps par rôle préviennent ces situations.

**Contrôle du Joueur** — Le dash est le "contrat" avec le joueur :
- Trop court → Pas de sauvetage possible
- Trop long → Trivialise le danger
- Cooldown trop long → Sentiment d'injustice

### Instrumentation et Télémétrie

Chaque run collecte des données pour affiner l'équilibrage :

- TTK moyen par type de zombie
- Dégâts reçus par minute
- Temps moyen par vague
- Cause de mort (type de zombie, distance, projectile)
- Distribution des armes utilisées
- Accuracy et usage des capacités

Ces données permettent d'itérer objectivement sur les paramètres.

---

## Modes de Jeu

### Survie

Le mode classique. Survivre le plus longtemps possible, accumuler le score le plus élevé. Pas de fin prévue, juste une difficulté qui monte jusqu'à l'inévitable submersion. Classements en ligne pour comparer ses performances.

### Campagne

Une série de niveaux avec des objectifs variés : survivre un nombre défini de vagues, éliminer un boss spécifique, protéger un PNJ civil pendant son extraction, collecter des échantillons tout en gérant les zombies. Chaque niveau complété débloque un fragment de l'histoire.

### Challenge Quotidien

Chaque jour, une seed fixe génère une configuration identique pour tous les joueurs : même environnement, mêmes spawns, mêmes drops. Classement mondial quotidien. Récompenses pour la participation et les performances.

### Coopération

Deux à quatre joueurs affrontent ensemble des hordes adaptées. Plus de joueurs signifie plus de zombies, mais aussi plus de complémentarité entre les personnages. Un Flic et une Médecin ne jouent pas de la même façon qu'un duo de Pyromanes.

---

## Narrative

### La trame de fond

L'épidémie a commencé dans un laboratoire pharmaceutique travaillant sur un traitement neurologique expérimental. Une fuite, un patient zéro, et quarante-huit heures plus tard, la ville entière était perdue.

Les survivants sont ceux qui ont trouvé refuge dans des bâtiments isolables : l'hôpital, le centre commercial, la station de métro. Mais les morts ne restent pas dehors. Ils s'accumulent aux portes, et finissent toujours par entrer.

### Découverte progressive

Entre les niveaux, le joueur découvre des **fragments narratifs** : pages de journal d'un chercheur, enregistrements audio de survivants, rapports militaires classifiés. Pièce par pièce, l'origine du virus se dévoile.

Le twist potentiel : le personnage jouable a un lien avec l'événement originel. Peut-être est-il le Patient Zéro lui-même, immunisé mais contagieux, cherchant un remède autant pour lui que pour l'humanité.

### Fins multiples

La campagne peut se conclure de différentes façons selon les choix et performances du joueur. Évasion, sacrifice, cure, ou révélation tragique. La rejouabilité narrative accompagne la rejouabilité mécanique.

---

## Identité Visuelle et Sonore

### Direction artistique

Style semi-réaliste avec une touche stylisée. Les zombies sont horrifiques mais lisibles visuellement : chaque type est immédiatement identifiable par sa silhouette. Les environnements alternent entre zones éclairées et ombres menaçantes. Le sang et la gore restent présents mais ne dominent pas l'écran au point de nuire à la lisibilité.

### Audio

Les armes claquent avec satisfaction. Chaque type de zombie possède sa signature sonore : les gargouillis des Shamblers, les pas précipités des Runners, le râle caractéristique du Screamer qui s'apprête à hurler. La musique monte en intensité avec les vagues, synthétiseurs lourds et percussions martiales. Les moments de calme entre les vagues offrent un répit sonore qui rend la reprise d'autant plus percutante.

---

## Conclusion

Zombie Hunter combine l'accessibilité immédiate d'un shooter arcade avec la profondeur stratégique d'un terrain de jeu tactique. Les colonnes ne sont pas de simples obstacles, mais des outils de survie. Les portes ne sont pas de simples spawners, mais des menaces à gérer. Chaque partie raconte une histoire différente de survie, d'adaptation, et finalement, de gloire ou de mort.

Le joueur ne tire pas simplement sur des zombies. Il orchestre un ballet mortel où le positionnement, le timing, et la gestion des ressources font la différence entre un héros et un cadavre de plus dans la horde.