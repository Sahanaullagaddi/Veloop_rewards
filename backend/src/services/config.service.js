const TapEconomyConfig = require('../models/tapEconomyConfig.model');
const ConfigAudit = require('../models/configAudit.model');

const DEFAULTS = {
  sve_prob: 0.60,
  ve_prob: 0.20,
  spin_prob: 0.02,
  gems_prob: 0.05,
  tokens_prob: 0.13,
  
  sve_amount: 1.0,
  ve_min: 0.6,
  ve_max: 1.7,
  gems_values: [0.5, 0.8, 1.0, 1.2, 2.0],
  tokens_min: 5,
  tokens_max: 100,
  
  energy_capacity_base: 500,
  energy_capacity_step: 100, // +100 per upgrade level
  energy_capacity_cost_base: 100, // VE cost for level 1 -> 2
  energy_capacity_cost_multiplier: 1.5, // multiplier for upgrade cost
  
  energy_regen_amount: 20,
  energy_regen_interval_mins: 20,
  
  recharge_speed_cost_base: 50, // Token cost for level 1 -> 2
  recharge_speed_cost_multiplier: 1.6,
  
  energy_bank_base_capacity: 500,
  energy_bank_purchase_cost: 200, // VE cost for bank upgrades (up to +2, level 2 and 3)
  energy_bank_regen_amount: 20,
  energy_bank_regen_interval_mins: 120, // +20/120min
  
  energy_shield_cost_ve: 100,
  energy_shield_duration_secs: 30,
  energy_shield_protection_rate: 0.90, // 90% protection
  energy_shield_cooldown_mins: 5,
  
  multitap_x2_cost_ve: 50,
  multitap_x3_cost_ve: 100,
  
  efficiency_level_1_cost_sve: 10,
  efficiency_level_2_cost_sve: 25,
  efficiency_level_3_cost_sve: 50,
  efficiency_multipliers: [1.0, 1.1, 1.2, 1.3],
  
  mystery_tap_chance: 0.10, // 10% chance for test satisfaction
  mystery_tap_interval: 25, // every 25 effective taps (down from 250)
  mystery_tap_sve_reward: 5.0,
  
  lucky_tap_interval: 30, // eligible at 30 accepted taps (down from 300)
  daily_challenge_target: 100, // eligible at 100 accepted taps (down from 1000)
};

let cache = {};

async function initializeConfig() {
  const currentKeys = Object.keys(DEFAULTS);
  for (const key of currentKeys) {
    let doc = await TapEconomyConfig.findOne({ key });
    if (!doc) {
      doc = new TapEconomyConfig({
        key,
        value: DEFAULTS[key],
        description: `Default configuration for ${key}`
      });
      await doc.save();
      await ConfigAudit.create({
        key,
        oldValue: null,
        newValue: DEFAULTS[key],
        reason: 'Initial default creation'
      });
    }
    cache[key] = doc.value;
  }
}

function get(key) {
  if (cache[key] !== undefined) {
    return cache[key];
  }
  return DEFAULTS[key];
}

async function update(key, newValue, adminId, reason) {
  // Validate probability sum if updating a prob
  if (['sve_prob', 've_prob', 'spin_prob', 'gems_prob', 'tokens_prob'].includes(key)) {
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0 || val > 1) {
      throw new Error('Probability must be between 0 and 1');
    }
  }

  const doc = await TapEconomyConfig.findOne({ key });
  const oldValue = doc ? doc.value : null;

  if (doc) {
    doc.value = newValue;
    doc.updatedAt = new Date();
    await doc.save();
  } else {
    await TapEconomyConfig.create({
      key,
      value: newValue,
      description: `User-defined configuration for ${key}`
    });
  }

  // Record audit log
  await ConfigAudit.create({
    adminId,
    key,
    oldValue,
    newValue,
    reason,
    timestamp: new Date()
  });

  // Update in-memory cache
  cache[key] = newValue;

  // Re-verify that probabilities sum to 1.0 (or very close)
  if (['sve_prob', 've_prob', 'spin_prob', 'gems_prob', 'tokens_prob'].includes(key)) {
    const sum = 
      parseFloat(get('sve_prob')) +
      parseFloat(get('ve_prob')) +
      parseFloat(get('spin_prob')) +
      parseFloat(get('gems_prob')) +
      parseFloat(get('tokens_prob'));
    if (Math.abs(sum - 1.0) > 0.0001) {
      throw new Error(`Warning: Probability sum is ${sum}, must sum to exactly 1.0`);
    }
  }

  return newValue;
}

function getAll() {
  const all = {};
  for (const key of Object.keys(DEFAULTS)) {
    all[key] = get(key);
  }
  return all;
}

module.exports = {
  initializeConfig,
  get,
  update,
  getAll
};
