# Easter Egg dans la Reolink E1-Zoom : le mode Patrol
(Format PDF - version EN- : [Easter Egg in the Reolink E1-Zoom_EN.pdf](https://community.jeedom.com/uploads/short-url/8NADblRY94e3GaMDHW87J5CMcJX.pdf) (51,9 Ko))

Récemment possesseur d\'une nouvelle caméra Reolink : E1-Zoom, j'ai découvert en grattant un peu les fonctions utilisables sur cette caméra que celle-ci possède une fonctionnalité cachée : 
### le mode Patrol.

je vous propose par le biais de ce tutoriel comment l'activer, la paramétrer et l'utiliser.

Bonne lecture

***
**MAJ Fev.2022** : Fonctionne aussi avec les cameras E1-Outdoor
***


Afin de pouvoir faire cela, je me suis appuyé sur le script fourni par @nechry et apporté quelques modifications pour utiliser ce mode.

> **script utilisé :** [Reolink_API_PTZ_Commands.sh.txt](https://community.jeedom.com/uploads/short-url/bm2VzgGAgbCaXNzDegAyjcU2BVB.txt) (2,2 Ko)
<p><br>
**<u>INFO</u>** : Avant d'utiliser le script, il faut modifier ce dernier avec vos paramètres. Tous les détails pour faire cette modification et pour le mettre en place dans Jeedom sont décrites [dans ce post](https://community.jeedom.com/t/reolink-liste-de-commandes-via-api/25565/45)
<p><br>
**<u>IMPORTANT</u>** : Toutes les opérations décrites ci-dessous sont exécutées en ligne de commande, via ssh et *exécutées depuis le répertoire dans lequel se trouve le script*.
<p><br>

**<p align=center>!! ATTENTION !!</p>**
<p align=center>Bien respecter la casse dans l'écriture des commandes</p>
<p><br>

**<u>1. Vérification de la présence de la fonctionnalité Patrol</u>**.

Pour vérifier la présence de la fonctionnalité, on passe par les commandes « GetPtzPatrol » et « PtzCtrl StartPatrol » pour faire les tests.

* 1ere vérif : Test de la commande « GetPtzPatrol »

Taper :

`./Reolink_API_PTZ_Commands.sh « IP » GetPtzPatrol`
*(remplacer « IP » par l'IP de votre caméra)*

résultat :

```
[
   {
      "cmd" : "GetPtzPatrol",
      "code" : 0,
      "value" : {
         "PtzPatrol" : [
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 1,
               "name" : "cruise1",
               "preset" : null,
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 2,
               "name" : "cruise2",
               "preset" : null,
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 3,
               "name" : "cruise3",
               "preset" : null,
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 4,
               "name" : "cruise4",
               "preset" : null,
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 5,
               "name" : "cruise5",
               "preset" : null,
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 6,
               "name" : "cruise6",
               "preset" : null,
               "running" : 0
            }
         ]
      }
   }
]
```

La commande GetPtzPatrol fonctionne… c'est bon signe !.. passons à la suivante.

 * 2eme vérif : Test de la commande « PtzCtrl StartPatrol »

Taper :

`./Reolink_API_PTZ_Commands.sh « IP »  PtzCtrl StartPatrol` 
*(remplacer « IP » par l'IP de votre caméra)*

résultat :


```
[
   {
      "cmd" : "PtzCtrl",
      "code" : 1,
      "error" : {
         "detail" : "param error",
         "rspCode" : -4
      }
   }
]
```
<p><br>

**<u>NB</u>** : On a le même résultat pour la commande « PtzCtrl StopPatrol »:
`./Reolink_API_PTZ_Commands.sh « IP »  PtzCtrl StopPatrol` 
*(remplacer « IP » par l'IP de votre caméra)*

En effet, la commande « PtzCtrl StartPatrol » (ou « PtzCtrl StopPatrol ») attend un paramètre : l'identifiant de la « cruise » choisi ; identifiant que l'on peut trouver via la commande GetPtzPatrol.

Si on exécute la commande avec l'identifiant (dans l'exemple ci-dessous, on prends le premier id =1)

`./Reolink_API_PTZ_Commands.sh « IP »  PtzCtrl StartPatrol 1` 
*(remplacer « IP » par l'IP de votre caméra)*

résultat :

```
[
   {
      "cmd" : "PtzCtrl",
      "code" : 1,
      "error" : {
         "detail" : "set config failed",
         "rspCode" : -13
      }
   }
]
```

Le résultat est cohérent : la commande fonctionne avec l'argument mais ne peux s’exécuter.
C'est tout à fait normal ; si on reprends le résultat de la première commande : « GetPtzPatrol », toutes les « cruises » n'ont pas de presets définis (preset:null) et qu'elles sont toutes désactivées (enable:0)

Si tous ces tests sont réalisés avec succès, on passe à l'étape de paramétrage.
<p><br>

**<u>2. Mise en place des presets pour une « cruise »</u>**

**<u>IMPORTANT<u>** : la fonctionnalité Patrol utilise les presets définis par la fonctionnalité PTZ Preset de la caméra. C'est le cas de la E1-Zoom.

Le Preset est une position de la caméra qui comprend l'angle PAN, l'angle TILT, le focus de la lentille et autres paramètres de position.

**<u>INFO</u>**: Chaque preset a un identifiant. On peut trouver celui-ci via l'interface Web de la Caméra -fonction PTZ-.

Pour faire cette opération de mise en place des presets pour le mode Patrol, on utilise la commande « SetPtzPatrol » avec un paramètre précis détaillé dans l'exemple ci-dessous.

**<u>Exemple</u>** :


```
./Reolink_API_PTZ_Commands.sh « IP » SetPtzPatrol
"{\"channel\":0,\"enable\":1,\"id\":1,\"preset\":[{\"dwellTime\":3,\"id\":1,\"speed\":10},{\"dwellTime\":4,\"id\":2,\"speed\":20}]}"
```

Dans l'exemple de configuration ci-dessus, on paramètre le « cruise » id:1 avec 2 presets définis (id:1 et id:2) et **on l\'active** (enable:1).

Pour chaque preset a définir dans le paramétrage de la commande, il faut renseigner 3 champs :

 * dwellTime : Temps d'arrêt en secondes sur le preset

 * id : Identifiant du preset

 * speed : Vitesse de la camera pour aller au preset

Dans le cas ou on veut plus de presets dans la configuration, il suffit de rajouter un bloc supplémentaire à la suite de celui défini dans l\'exemple ci-dessus.

**<p align=center>!!ATTENTION !!</p>**
*<p align=center>bien séparer les blocs par un virgule. Pas de virgule à la fin du dernier bloc</p>*

**<u>NB</u>** : tous les blocs sont définis dans un tableau (\[\])

**Format du bloc** :
{\\\"dwellTime\\\":xxx,\\\"id\\\":y,\\\"speed\\\":zz}
*(remplacer xxx, y et zz par les valeurs souhaitées)*

**Autre Exemple** (avec 5 presets définis -id:1,id:2,id:4,id:5 et id:7-)


```
./Reolink_API_PTZ_Commands.sh « IP » SetPtzPatrol
"{\"channel\":0,\"enable\":1,\"id\":1,\"preset\":[{\"dwellTime\":3,\"id\":1,\"speed\":10},{\"dwellTime\":4,\"id\":2,\"speed\":20},{\"dwellTime\":10,\"id\":4,\"speed\":10},{\"dwellTime\":5,\"id\":5,\"speed\":20},{\"dwellTime\":15,\"id\":7,\"speed\":15}]}"
```

Par le biais de la commande GetPtzPatrol, on visualise le paramétrage mis en place (exemple avec 5 presets -id de la cruise:1- et  « cruise » activé -enable:1-) :

`./Reolink_API_PTZ_Commands.sh « IP » GetPtzPatrol`
*(remplacer « IP » par l'IP de votre caméra)*

résultat :


```
[
   {
      "cmd" : "GetPtzPatrol",
      "code" : 0,
      "value" : {
         "PtzPatrol" : [
            {
               "channel" : 0,
               "enable" : 1,
               "id" : 1,
               "name" : "cruise1",
               "preset" : [
                  {
                     "dwellTime" : 3,
                     "id" : 1,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 4,
                     "id" : 2,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 10,
                     "id" : 4,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 5,
                     "id" : 5,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 15,
                     "id" : 7,
                     "speed" : 15
                  }
               ],
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 2,
               "name" : "cruise2",
               "preset" : [
                  {
                     "dwellTime" : 3,
                     "id" : 1,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 4,
                     "id" : 2,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 10,
                     "id" : 4,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 5,
                     "id" : 5,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 15,
                     "id" : 7,
                     "speed" : 15
                  }
               ],
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 3,
               "name" : "cruise3",
               "preset" : [
                  {
                     "dwellTime" : 3,
                     "id" : 1,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 4,
                     "id" : 2,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 10,
                     "id" : 4,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 5,
                     "id" : 5,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 15,
                     "id" : 7,
                     "speed" : 15
                  }
               ],
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 4,
               "name" : "cruise4",
               "preset" : [
                  {
                     "dwellTime" : 3,
                     "id" : 1,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 4,
                     "id" : 2,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 10,
                     "id" : 4,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 5,
                     "id" : 5,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 15,
                     "id" : 7,
                     "speed" : 15
                  }
               ],
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 5,
               "name" : "cruise5",
               "preset" : [
                  {
                     "dwellTime" : 3,
                     "id" : 1,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 4,
                     "id" : 2,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 10,
                     "id" : 4,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 5,
                     "id" : 5,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 15,
                     "id" : 7,
                     "speed" : 15
                  }
               ],
               "running" : 0
            },
            {
               "channel" : 0,
               "enable" : 0,
               "id" : 6,
               "name" : "cruise6",
               "preset" : [
                  {
                     "dwellTime" : 3,
                     "id" : 1,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 4,
                     "id" : 2,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 10,
                     "id" : 4,
                     "speed" : 10
                  },
                  {
                     "dwellTime" : 5,
                     "id" : 5,
                     "speed" : 20
                  },
                  {
                     "dwellTime" : 15,
                     "id" : 7,
                     "speed" : 15
                  }
               ],
               "running" : 0
            }
         ]
      }
   }
]
```

Dans l'exemple précédent, on voit la configuration poussée par la commande SetPtzPatrol a été mis pour l'ensemble des « cruises ».

Dans les faits, pour la E1-Zoom, on ne pourra configurer *qu'une seule et unique* « cruise » de possible (les autres « cruises » récupérant la configuration du premier).

**<u>NB IMPORTANT</u>** : Il existe d'autres caméras -cf [post Reolink](https://support.reolink.com/hc/en-us/articles/900000578903-What-is-Preset-and-Cruise)- possédant cette fonctionnalité de Preset (et qui utilisent le CGI) qui pourraient, potentiellement, avoir également ce mode Patrol caché.

Si le paramétrage a été réalisé avec succès (\"rspCode\" : 200), on passe à l'étape d'exécution.

**3. Exécution de la « cruise » configurée, depuis la commande « PtzCtrl ».**

Ayant réalisé les opérations précédentes, on peut lancer la « cruise » que l'on a activé.

Suivant l'exemple précédent (5 presets), tapez la commande suivante :

`./Reolink_API_PTZ_Commands.sh « IP » PtzCtrl StartPatrol 1`
*(remplacer « IP » par l\'IP de votre caméra)*

résultat :

```
[
   {
      "cmd" : "PtzCtrl",
      "code" : 0,
      "value" : {
         "rspCode" : 200
      }
   }
]
```

La caméra balaye les différents presets suivants leurs configurations.
La « cruise » s'effectue en 2 passes. Dans le cas des 5 presets, voici comment le balayage s'effectue :

→ Départ Position d'origine

→ preset 1 (dwellTime 3s, speed 10)

→ preset 2 (dwellTime 4s, speed 20)

→ preset 4 (dwellTime 10s, speed 10)

→ preset 5 (dwellTime 5s, speed 20)

→ preset 7 (dwellTime 15s, speed 15)

→ preset 1 (dwellTime 3s, speed 10)

→ preset 2 (dwellTime 4s, speed 20)

→ preset 4 (dwellTime 10s, speed 10)

→ preset 5 (dwellTime 5s, speed 20)

→ preset 7 (dwellTime 15s, speed 15)

→ preset 1 (dwellTime 3s, speed 10)

→ Retour à la Position d'origine


**<u>NB</u>** : On peut arrêter la « cruise » à tout moment via la commande StopPatrol, en précisant l'id de la « cruise »:

`./Reolink_API_PTZ_Commands.sh « IP » PtzCtrl StopPatrol 1`
*(remplacer « IP » par l'IP de votre caméra)*

résultat :


```
[
   {
      "cmd" : "PtzCtrl",
      "code" : 0,
      "value" : {
         "rspCode" : 200
      }
   }
]
```

***

### FAQ

 * Comment remettre à zéro les « cruises » -revenir à l'état initial
avant toute modification- (enable:0):

```
./Reolink_API_PTZ_Commands.sh « IP » SetPtzPatrol "{\"channel\":0,\"enable\":0,\"id\":1,\"preset\":[]}"
```

 * Dois t-on remettre à zéro la configuration pour en remettre une nouvelle :

    **NON** : En mettant une nouvelle configuration, cela écrase la précédente.

* Comment utiliser les commandes avec Jeedom :

  Toutes les commandes indiquées précédemment sont compatibles Jeedom. Il suffit de créer des commandes de script Jeedom (de type Script/Action) et reconduire les commandes dans la partie commande.
**NB IMPORTANT** : il faut que le script soit dans le répertoire `/var/www/html/plugins/script/data`, que www-data soit le propriétaire du script et préciser le chemin de l'emplacement du script dans la commande : remplacer `./Reolink_API_PTZ_Commands.sh` par `/var/www/html/plugins/script/data/Reolink_API_PTZ_Commands.sh`