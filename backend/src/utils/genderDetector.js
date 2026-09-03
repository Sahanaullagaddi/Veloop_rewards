const FEMALE_NAMES = new Set([
  'reena', 'rina', 'sahana', 'sarah', 'sara', 'priya', 'pooja', 'puja', 'anita', 'neha', 
  'kavya', 'maya', 'divya', 'shreya', 'deepa', 'swati', 'trinity', 'emma', 'anna', 'olivia', 
  'sophia', 'isabella', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'abigail', 'emily', 
  'elizabeth', 'mila', 'ella', 'avery', 'sofia', 'camila', 'aria', 'scarlett', 'victoria', 
  'madison', 'luna', 'grace', 'chloe', 'penelope', 'layla', 'riley', 'zoey', 'nora', 'lily', 
  'eleanor', 'hannah', 'lillian', 'addison', 'aubrey', 'ellie', 'stella', 'natalie', 'zoe', 
  'leah', 'hazel', 'violet', 'aurora', 'savannah', 'audrey', 'brooklyn', 'bella', 'claire', 
  'skylar', 'lucy', 'paisley', 'everly', 'caroline', 'nova', 'genesis', 'emilia', 'kennedy', 
  'samantha', 'willow', 'kinsley', 'naomi', 'aaliyah', 'elena', 'ariana', 'allison', 'gabriella', 
  'alice', 'madelyn', 'cora', 'ruby', 'eva', 'serenity', 'autumn', 'adeline', 'hailey', 'gianna', 
  'valentina', 'isla', 'eliana', 'quinn', 'ivy', 'sadie', 'piper', 'lydia', 'alexa', 'josephine', 
  'emery', 'julia', 'delilah', 'arianna', 'vivian', 'kaylee', 'sophie', 'brielle', 'madeline', 
  'clara', 'melanie', 'mackenzie', 'alina', 'mary', 'andrea', 'katherine', 'melody', 'isabelle', 
  'rose', 'norah', 'marley', 'amara', 'fiona', 'ananya', 'aishwarya', 'sneha', 'radha', 'laxmi', 
  'lakshmi', 'geeta', 'gita', 'meena', 'leena', 'sheela', 'veena', 'sita', 'sunita', 'jyoti', 
  'sonam', 'mona', 'tina', 'riya', 'siya', 'diya', 'jiya', 'kiran', 'simran', 'girl', 'woman', 'queen'
]);

function inferGenderFromName(name) {
  if (!name || typeof name !== 'string') return 'male';
  const clean = name.toLowerCase().replace(/[^a-z]/g, '');
  if (FEMALE_NAMES.has(clean)) return 'female';
  for (const fName of FEMALE_NAMES) {
    if (clean.startsWith(fName) || clean.includes(fName)) return 'female';
  }
  return 'male';
}

module.exports = {
  inferGenderFromName,
  FEMALE_NAMES
};
