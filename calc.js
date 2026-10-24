/* Pure calculation logic: no DOM, no network. */
const ACTIVITY = { // editable activity multipliers
  sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9
};
const Calc = {
  bmi: (w, h) => (h > 0 ? w / Math.pow(h / 100, 2) : NaN),
  bmiClass(b) {
    return b < 18 ? 'under' : b < 25 ? 'normal' : b < 30 ? 'over' : b < 40 ? 'obese' : 'severe';
  },
  ibw: (g, h) => ((h - 152) / 2.54) * (g === 'male' ? 2.7 : 2.2) + (g === 'male' ? 48 : 45),
  bmr: (g, w, h, a) => 10 * w + 6.25 * h - 5 * a + (g === 'male' ? 5 : -161),
  run(i) {
    const f = ACTIVITY[i.activity];
    const bmi = Calc.bmi(i.weight, i.height), bmr = Calc.bmr(i.gender, i.weight, i.height, i.age);
    return { bmi, cls: Calc.bmiClass(bmi), ibw: Calc.ibw(i.gender, i.height), bmr, factor: f, tdee: bmr * f };
  },
  validate(i) { // returns {field: messageKey}
    const e = {};
    if (!i.name.trim()) e.name = 'eName';
    if (i.gender !== 'male' && i.gender !== 'female') e.gender = 'eGender';
    if (!(i.age >= 1 && i.age <= 120)) e.age = 'eAge';
    if (!(i.activity in ACTIVITY)) e.activity = 'eActivity';
    if (!(i.height >= 50 && i.height <= 250)) e.height = 'eHeight';
    if (!(i.weight >= 10 && i.weight <= 500)) e.weight = 'eWeight';
    return e;
  }
};
if (typeof module !== 'undefined') module.exports = { Calc, ACTIVITY };
