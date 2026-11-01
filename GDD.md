# ADAM: TIME MEDIC — Game Design Document (v2)
Chapter I: **Pompeii, 79 AD** · First-person rescue / survival · Browser (Three.js, static build)

## 1. Pitch & tone
Adam is a field medic of the **Time Rescue Service**. HQ sent him to Pompeii on the morning of the eruption, generously equipped with **one plaster** (well, five). Save as many citizens as possible and get them to the harbor before the pyroclastic surge hits.
- **Bright and lively**, not gloomy: sunny morning, saturated warm plaster colors, blue sky. The volcano plume grows over time and the light slowly warms. **Only the final minute darkens and reddens.**
- Light humor in the UI copy (depot shop descriptions, HQ toasts).
- Clean, readable look: the painterly filter is light and the HUD is crisp (Rajdhani / Barlow Condensed). No grain, scanlines or flicker.

## 2. Core loop
Explore → find the injured (markers, compass, map) → diagnose the injury type → treat with the right tool (mini-game; better tool = faster) → escort, carry or cart them to the harbor → earn **Chrono credits** → buy tools, upgrades and vehicles at the **Time Rescue depot** → next run (persistent progress).

## 3. Timer & fail states
- **TIME LEFT**: 3:00, shown on the chronometer dial (raise the wrist with Q/Tab) and on the HUD, with a red draining bar.
- At 0 the pyroclastic surge hits → GAME OVER → **Rewind** (restart; credits and upgrades are kept).
- Health 0 → GAME OVER.
- Heat pushes the player: the closer to Vesuvius, the hotter. There is no time to dawdle.

## 4. Vitals (always visible, bottom-left cluster + chronometer)
| Vital | Rules |
|---|---|
| Health | Damage from debris, overheating, bad air, starvation or dehydration. Food and water restore it. The red screen edge appears **only when health is below 100**, stronger as it falls. |
| Stamina | Sprinting drains it. **At 0 Adam is exhausted: he can't run** until stamina is back above 30% (walk or rest). Heavy breathing. Hunger or thirst below 25% halves regen. |
| Pulse (bpm) | Resting 70. Rises with sprint, heat and damage; falls slowly. Above 160 stamina regen stops. A heartbeat sound plays when it is high. |
| Air quality | Ash zones lower it. **Crouching/crawling** in smoke gives better air. The ash mask cuts loss by 70%. Below 30%: health loss and coughing. |
| Hunger / Thirst | Drain slowly (thirst faster; faster in heat). Below 25%: stamina regen halved. At 0: health loss. |
| Body temperature | 36.6 °C normal. Rises near Vesuvius (north) and near fires and lava. Shade, fountains and water cool it; moving away cools to normal. Above 38.5: warm haze on screen edges. Above 39.5: health damage. Heat-resistance upgrade. |

## 5. Movement
Walk (WASD) · Sprint (Shift, stamina) · Crouch/crawl (C or Ctrl: lower, slower, fits under fallen beams, better air in smoke) · Jump (Space) · Vault low obstacles (jump over crates and rubble) · Carry an injured person on your back (slower, no sprint) · Stretcher (faster carry) · Vehicles: **running < hand cart < horse cart**.

## 6. Injuries & medical tools (progression, like a toothbrush → broom → snow plow)
| Tool | Tier | Mini-game length | Treats |
|---|---|---|---|
| Plaster | 1 | long (6 presses) | Cut |
| Bandage | 2 | 4 presses + wrap | Cut, Bleeding |
| First-aid kit | 3 | 3 presses | Cut, Bleeding, Burn |
| Splint | 3 | 3 presses | Fracture (patient must be carried) |
| Defibrillator | 4 | 1 timed shock | Collapse/Cardiac (patient must be carried) |
| Stretcher | — | — | Carry speed ×0.85 instead of ×0.6 |
Tools are consumed on use (defibrillator: charges). The game tells you if you need a better tool.

## 7. Inventory (hotbar always visible with counts)
1 Plaster ×5 · 2 Bandage ×6 · 3 First-aid kit ×1 · 4 Splint ×0 · 5 Defibrillator ×0 · 6 Water ×2 · 7 Food ×1 · 8 Ash mask ×0. Number keys select a tool or use a consumable. The selected tool is used for treatment, and if it is not suitable the best suitable one in the inventory is picked automatically.

## 8. Food & pickups
Figs, grapes, bread (panis), water amphorae, street fountains (drink and cool down), and supply crates with plasters and bandages. They are scattered at market stalls. Pickup prompt "[E] Take figs". Food restores hunger and some health; water restores thirst and cools.

## 9. Economy & persistence
- Each saved person gives **Chrono credits** (by severity: 40–120) and a +10 s time bonus ("HQ bends physics a little").
- **Time Rescue depot** at the harbor, a shop where you buy tools, consumables, permanent upgrades (Stamina, Speed, Heat resistance, Carry capacity) and vehicles (Hand cart → Horse cart).
- Progress (credits, upgrades, vehicles, depot stock, best score) is saved in **localStorage** across runs.

## 10. World
Pompeii is laid out in districts. The fog-of-war map (**M**) reveals as you explore and shows the injured, depot, harbor, food and fountains.
- **Via di Stabia** (start, north toward Vesuvius = hotter)
- **Decumanus** (main east–west street to the harbor)
- **Vicolo** (west alley)
- **Market district** (north-east, stalls, food)
- **Temple district** (south-east, *locked by rubble until 3 people are saved*)
- **Harbor** with the depot and the boat
7 injured with different injury types. Fallen beams (crawl under), crates and rubble (vault), ash zones, fires (heat).

## 11. Hazards
Falling debris with a shadow telegraph (more often over time), heat zones and fires, ash clouds, and the surge at 0:00.

## 12. HUD
Compass (HARBOR, injured, depot markers) · objective popups · interact prompts · checkpoint text · TIME LEFT · vitals cluster · hotbar · credits · chronometer dial (time, health arc) · red edge only when hurt · heat haze edges only when hot.

## 13. Audio (WebAudio synth)
Rumble that grows over time, footsteps, heartbeat (pulse), heavy breathing (exhaustion), cough (bad air), UI chimes, pickups, cash register at the shop, impacts, surge roar.

## 14. Co-op (design only, not in v2)
- 2–4 friends play the same chapter online.
- **Give resources** to each other: bandages, plasters, food, water, Chrono credits.
- **Carry a stretcher together**: two players, so carry speed is close to normal.
- **Revive a downed teammate**: health 0 → "downed" for 30 s, and a teammate with a first-aid kit can revive them.
- **Shared map discoveries** (fog of war is revealed for the whole team) and shared injured markers.
- **Team leaderboard**: saved people, time left, credits per chapter.
- Code readiness: the inventory is a plain `{itemId: count}` object behind `Inventory.add/remove/has/transfer(from,to,id,n)`, and items are defined in a data table `ITEMS`. A future network layer only needs to serialize these.

## 15. Future
- More chapters: **Titanic** (final levels: lifeboats, a **bathyscaphe** for underwater rescue), Great Fire of London, etc.
- Character art pass (real models), voiced HQ, the sitcom-like helpdesk.
- Steam/Godot port if the browser prototype tests well.
