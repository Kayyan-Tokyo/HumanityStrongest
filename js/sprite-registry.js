(() => {
  'use strict';
  // Keys are the official CSV IDs. src is the idle/master image; null means artwork is not registered yet.
  // frame: source [x,y,width,height]. height: body display height before the shared 1.35 scale.
  // sourceFacing: native image direction (1=right, -1=left); poses may override it per sheet.
  const DEFAULT = { src:null, sourceFacing:1, height:54, frame:[0,0,24,24] };
  const characters = {
    'neanderthal': { ...DEFAULT, poses:{} },
    'paleolithic-hunter': { ...DEFAULT, poses:{} },
    'spartan': {
      sourceFacing:1,
      src:"./assets/characters/spartan_idle.png",
      height:56,
      frame:[22,45,147,139],
      poses:{
        damage:{
          src:"./assets/characters/spartan_hit_4f.png",
          sourceFacing:1,
          once:true,
          timeField:"hitTime",
          duration:400,
          knockback:3,
          anchor:[320,516],
          referenceHeight:467,
          frames:[[0,0,640,544],[640,0,640,544],[1280,0,640,544],[1920,0,640,544]]
        },
        attack:{
          src:"./assets/characters/spartan_thrust_4f.png",
          once:true,
          duration:500,
          hitOffset:[94,48],
          anchor:[240,460],
          referenceHeight:453,
          frames:[[0,0,832,480],[832,0,832,480],[1664,0,832,480],[2496,0,832,480]]
        },
        walk:{
          src:"./assets/characters/spartan_walk_4f.png",
          fps:7,
          referenceHeight:144,
          anchors:[[80.5,142],[87,142],[81.5,145],[85.5,144]],
          frames:[[31,34,153,142],[202,35,160,142],[414,14,150,145],[593,16,160,144]]
        }
      }
    },
    'gladiator': { ...DEFAULT, poses:{} },
    'samurai': { ...DEFAULT, poses:{} },
    'medieval-knight': { ...DEFAULT, poses:{} },
    'mongol-cavalry': { ...DEFAULT, poses:{} },
    'edo-farmer': { ...DEFAULT, poses:{} },
    'viking': { ...DEFAULT, poses:{} },
    'meiji-sumo': { ...DEFAULT, poses:{} },
    'ww2-japanese-soldier': { ...DEFAULT, poses:{} },
    'ww2-us-soldier': { ...DEFAULT, poses:{} },
    'us-office-worker': { ...DEFAULT, poses:{} },
    'sumo': {
      recoveryWalk:true,
      sourceFacing:-1,
      src:"./assets/characters/sumo_idle.png",
      height:52,
      frame:[25,75,142,109],
      poses:{
        damage:{
          src:"./assets/characters/sumo_hit_4f.png",
          sourceFacing:1,
          once:true,
          timeField:"hitTime",
          duration:400,
          knockback:3,
          anchor:[320,516],
          referenceHeight:466,
          frames:[[0,0,768,544],[768,0,768,544],[1536,0,768,544],[2304,0,768,544]]
        },
        walk:{
          src:"./assets/characters/sumo_walk_4f.png",
          sourceFacing:1,
          fps:6,
          anchor:[160,316],
          referenceHeight:300,
          frames:[[0,0,320,336],[320,0,320,336],[640,0,320,336],[960,0,320,336]]
        },
        attack:{
          lunge:8,
          src:"./assets/characters/sumo_slap_4f.png",
          sourceFacing:1,
          once:true,
          duration:500,
          hitOffset:[61,47],
          anchor:[256,476],
          referenceHeight:458,
          frames:[[0,0,704,496],[704,0,704,496],[1408,0,704,496],[2112,0,704,496]]
        }
      }
    },
    'heavyweight-boxer': { ...DEFAULT, poses:{} },
    'heavyweight-judoka': { ...DEFAULT, poses:{} },
    'mma-fighter': { ...DEFAULT, poses:{} },
    'bjj-fighter': { ...DEFAULT, poses:{} },
    'japanese-delinquent': { ...DEFAULT, poses:{} },
    'nakameguro-barber': { ...DEFAULT, poses:{} },
    'modern-us-soldier': { ...DEFAULT, poses:{} },
    'hacker': { ...DEFAULT, poses:{} },
    'american-rapper': { ...DEFAULT, poses:{} },
    'chinese-man': { ...DEFAULT, poses:{} },
    'muay-thai': { ...DEFAULT, poses:{} },
    'oil-wrestler': { ...DEFAULT, poses:{} },
    'rugby-player': { ...DEFAULT, poses:{} },
    'japanese-office-worker': { ...DEFAULT, poses:{} },
    'bodybuilder': { ...DEFAULT, poses:{} },
    'female-mma-fighter': { ...DEFAULT, poses:{} }
  };
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  window.HumanitySprites = freeze(characters);
})();
