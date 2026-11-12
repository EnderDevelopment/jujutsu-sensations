import { world, system } from "@minecraft/server";

const cooldowns = new Map();
const techniques = {
  "jj:divergent_fist": { name: "Divergent Fist", cooldown: 12, action: divergentFist },
  "jj:blue": { name: "Blue", cooldown: 80, action: blue },
  "jj:red": { name: "Red", cooldown: 100, action: red },
  "jj:hollow_purple": { name: "Hollow Purple", cooldown: 220, action: hollowPurple },
  "jj:malevolent_shrine": { name: "Malevolent Shrine", cooldown: 300, action: malevolentShrine }
};

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const technique = techniques[event.itemStack.typeId];
  if (!technique || !player) return;

  const key = `${player.id}:${event.itemStack.typeId}`;
  const remaining = cooldowns.get(key) ?? 0;
  if (remaining > 0) {
    player.onScreenDisplay.setActionBar(`§c${technique.name}: ${Math.ceil(remaining / 20)}s`);
    return;
  }

  technique.action(player);
  cooldowns.set(key, technique.cooldown * 20);
  player.onScreenDisplay.setActionBar(`§d${technique.name} §7activated`);
});

system.runInterval(() => {
  for (const [key, ticks] of cooldowns) {
    if (ticks <= 1) cooldowns.delete(key);
    else cooldowns.set(key, ticks - 1);
  }
}, 1);

function nearbyEntities(player, radius) {
  return player.dimension.getEntities({ location: player.location, maxDistance: radius }).filter((entity) => entity.id !== player.id);
}

function horizontalDirection(player) {
  const rotation = player.getRotation();
  const radians = rotation.y * Math.PI / 180;
  return { x: -Math.sin(radians), y: 0, z: Math.cos(radians) };
}

function divergentFist(player) {
  const direction = horizontalDirection(player);
  for (const entity of nearbyEntities(player, 4)) {
    entity.applyDamage(8);
    entity.applyImpulse({ x: direction.x * 1.2, y: 0.45, z: direction.z * 1.2 });
  }
  player.dimension.playSound("random.explode", player.location, { volume: 0.5, pitch: 1.4 });
}

function blue(player) {
  for (const entity of nearbyEntities(player, 12)) {
    const dx = player.location.x - entity.location.x;
    const dy = player.location.y - entity.location.y;
    const dz = player.location.z - entity.location.z;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1);
    entity.applyImpulse({ x: dx / distance * 1.3, y: dy / distance * 0.5 + 0.15, z: dz / distance * 1.3 });
  }
  player.dimension.spawnParticle("minecraft:blue_flame_particle", player.location);
  player.dimension.playSound("mob.evocation_illager.prepare_attack", player.location, { volume: 0.8, pitch: 1.5 });
}

function red(player) {
  for (const entity of nearbyEntities(player, 8)) {
    const dx = entity.location.x - player.location.x;
    const dz = entity.location.z - player.location.z;
    const distance = Math.max(Math.sqrt(dx * dx + dz * dz), 1);
    entity.applyDamage(12);
    entity.addEffect("minecraft:fire_resistance", 2, { showParticles: false });
    entity.applyImpulse({ x: dx / distance * 1.8, y: 0.7, z: dz / distance * 1.8 });
  }
  player.dimension.spawnParticle("minecraft:lava_particle", player.location);
  player.dimension.playSound("random.explode", player.location, { volume: 1.2, pitch: 0.7 });
}

function hollowPurple(player) {
  const direction = horizontalDirection(player);
  const origin = { x: player.location.x + direction.x * 1.5, y: player.location.y + 1.2, z: player.location.z + direction.z * 1.5 };
  const projectile = player.dimension.spawnEntity("minecraft:fireball", origin);
  projectile.applyImpulse({ x: direction.x * 1.8, y: 0.05, z: direction.z * 1.8 });
  player.dimension.spawnParticle("minecraft:portal_directional", origin);
  player.dimension.playSound("mob.wither.shoot", player.location, { volume: 1.4, pitch: 1.2 });
}

function malevolentShrine(player) {
  player.dimension.playSound("mob.wither.death", player.location, { volume: 0.7, pitch: 1.6 });
  let pulses = 0;
  const interval = system.runInterval(() => {
    for (const entity of nearbyEntities(player, 16)) {
      entity.applyDamage(3);
      entity.addEffect("minecraft:slowness", 30, { amplifier: 1, showParticles: true });
    }
    player.dimension.spawnParticle("minecraft:damage_indicator_particle", player.location);
    pulses += 1;
    if (pulses >= 10) system.clearRun(interval);
  }, 10);
}
