/**
 * ============================================================================
 * SCORING ENGINE — FIXTURE TESTS
 * ============================================================================
 *
 * Ten representative products with hand-validated expected grades. Pins the
 * engine so a pillar refactor can't silently change real-world scores.
 *
 * Run:  node --test --experimental-strip-types engine-tests.ts
 * ============================================================================
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { scoreProduct, type Grade, type ProductInput } from './scoring-engine.ts';

function expectGrade(product: ProductInput, grades: Grade[], range: [number, number]) {
  const audit = scoreProduct(product);
  const [min, max] = range;
  assert.ok(
    grades.includes(audit.grade),
    `${product.name}: expected grade in ${grades.join('/')}, got ${audit.grade} (score=${audit.score})`,
  );
  assert.ok(
    audit.score >= min && audit.score <= max,
    `${product.name}: score ${audit.score} outside expected range ${min}..${max}`,
  );
  return audit;
}

describe('engine fixtures — real French supermarket products', () => {
  it('Evian (mineral water) → A+', () => {
    expectGrade(
      {
        name: 'Evian eau minérale',
        category: 'beverage_water',
        nova_class: 1,
        ingredients: [{ name: 'eau minérale naturelle', is_whole_food: true, category: 'food' }],
        nutrition: {
          energy_kcal: 0, fat_g: 0, saturated_fat_g: 0, carbs_g: 0,
          sugars_g: 0, fiber_g: 0, protein_g: 0, salt_g: 0,
        },
        origin: 'France', named_oils: true, origin_transparent: true,
      },
      ['A+', 'A'],
      [70, 100],
    );
  });

  it('Skyr nature → A or A+', () => {
    expectGrade(
      {
        name: 'Skyr nature',
        category: 'yogurt',
        nova_class: 3,
        ingredients: [
          { name: 'lait écrémé', is_whole_food: true, category: 'food' },
          { name: 'ferments lactiques', category: 'food' },
        ],
        nutrition: {
          energy_kcal: 60, fat_g: 0.2, saturated_fat_g: 0.1, carbs_g: 4,
          sugars_g: 4, added_sugars_g: 0, fiber_g: 0, protein_g: 11, salt_g: 0.1,
        },
        fermented: true, origin: 'France', named_oils: true, origin_transparent: true,
      },
      ['A', 'A+', 'B'],
      [55, 100],
    );
  });

  it('Coca-Cola Classic → D or F', () => {
    expectGrade(
      {
        name: 'Coca-Cola',
        category: 'beverage_soft',
        nova_class: 4,
        ingredients: [
          { name: 'eau gazéifiée', is_whole_food: true, category: 'food' },
          { name: 'sucre', category: 'food' },
          { name: 'colorant: caramel', e_number: 'E150', category: 'additive' },
          { name: 'acide phosphorique', e_number: 'E338', category: 'additive' },
          { name: 'arômes naturels', category: 'additive' },
          { name: 'caféine', category: 'additive' },
        ],
        nutrition: {
          energy_kcal: 42, fat_g: 0, saturated_fat_g: 0, carbs_g: 10.6,
          sugars_g: 10.6, added_sugars_g: 10.6, fiber_g: 0, protein_g: 0, salt_g: 0,
        },
        named_oils: true,
      },
      ['D', 'F'],
      [0, 40],
    );
  });

  it('Nutella → C or D (engine gives it mid-range due to named oil + single sugar bonuses)', () => {
    const audit = scoreProduct({
      name: 'Nutella',
      category: 'snack_sweet',
      nova_class: 4,
      ingredients: [
        { name: 'sucre', category: 'food' },
        { name: 'huile de palme', category: 'food' },
        { name: 'noisettes', is_whole_food: true, category: 'food' },
        { name: 'cacao maigre', category: 'food' },
        { name: 'lait écrémé en poudre', category: 'food' },
        { name: 'émulsifiants: lécithines', e_number: 'E322', category: 'additive' },
        { name: 'vanilline', category: 'additive' },
      ],
      nutrition: {
        energy_kcal: 539, fat_g: 30.9, saturated_fat_g: 10.6, carbs_g: 57.5,
        sugars_g: 56.3, added_sugars_g: 50, fiber_g: 0, protein_g: 6.3, salt_g: 0.107,
      },
      named_oils: true,
    });
    assert.ok(['C', 'D', 'F'].includes(audit.grade), `Nutella grade ${audit.grade} (score ${audit.score})`);
    // Critical sugar deduction must fire (that's the product's defining problem).
    const sugarDeduction = audit.pillars.negative_nutrients.deductions.find((d) =>
      /sugars?/i.test(d.reason) && d.severity === 'critical',
    );
    assert.ok(sugarDeduction, 'Nutella should trigger a critical sugar deduction');
  });

  it('Jambon blanc sans nitrite → A or B', () => {
    expectGrade(
      {
        name: 'Jambon blanc sans nitrite',
        category: 'processed_meat',
        nova_class: 3,
        ingredients: [
          { name: 'jambon de porc 95%', is_whole_food: true, percentage: 95, category: 'food' },
          { name: 'sel', category: 'food' },
          { name: 'bouillon', category: 'food' },
          { name: 'antioxydant: ascorbate de sodium', e_number: 'E301', category: 'additive' },
        ],
        nutrition: {
          energy_kcal: 105, fat_g: 2.5, saturated_fat_g: 0.9, carbs_g: 0.5,
          sugars_g: 0.5, added_sugars_g: 0, fiber_g: 0, protein_g: 21, salt_g: 1.8,
        },
        origin: 'France', named_oils: true, origin_transparent: true,
      },
      ['A', 'B'],
      [55, 85],
    );
  });

  it('Camembert → A or B (category-aware sat fat)', () => {
    const audit = scoreProduct({
      name: 'Camembert',
      category: 'cheese',
      nova_class: 3,
      ingredients: [
        { name: 'lait cru de vache', is_whole_food: true, category: 'food' },
        { name: 'sel', category: 'food' },
        { name: 'ferments lactiques', category: 'food' },
        { name: 'présure', category: 'food' },
      ],
      nutrition: {
        energy_kcal: 290, fat_g: 23, saturated_fat_g: 14, carbs_g: 0.5,
        sugars_g: 0.5, added_sugars_g: 0, fiber_g: 0, protein_g: 20, salt_g: 1.4,
      },
      origin: 'Normandie', named_oils: true, origin_transparent: true, fermented: true,
    });
    assert.ok(['A', 'B'].includes(audit.grade), `Camembert grade ${audit.grade} (score ${audit.score})`);
    const satDeduction = audit.pillars.negative_nutrients.deductions.find((d) =>
      d.reason.startsWith('Saturated fat'),
    );
    assert.equal(
      satDeduction?.points,
      -3,
      'sat-fat deduction for cheese should be moderate (-3), not major/critical',
    );
  });

  it("Huile d'olive → A (oil sat-fat tolerance)", () => {
    const audit = scoreProduct({
      name: "Huile d'olive vierge extra",
      category: 'oil_fat',
      nova_class: 1,
      ingredients: [{ name: "huile d'olive vierge extra", category: 'food' }],
      nutrition: {
        energy_kcal: 824, fat_g: 91.6, saturated_fat_g: 13.8, carbs_g: 0,
        sugars_g: 0, fiber_g: 0, protein_g: 0, salt_g: 0,
      },
      origin: 'Italie', named_oils: true, origin_transparent: true,
    });
    const satDeduction = audit.pillars.negative_nutrients.deductions.find((d) =>
      d.reason.startsWith('Saturated fat'),
    );
    assert.equal(
      satDeduction,
      undefined,
      "olive oil's 13.8g sat fat must not deduct (oil_fat tolerance is 20/35/50)",
    );
  });

  it('Pain complet bio → A or B', () => {
    expectGrade(
      {
        name: 'Pain complet bio',
        category: 'bread',
        nova_class: 3,
        ingredients: [
          { name: 'farine de blé complète', is_whole_food: true, category: 'food' },
          { name: 'eau', is_whole_food: true, category: 'food' },
          { name: 'levain', category: 'food' },
          { name: 'sel', category: 'food' },
        ],
        nutrition: {
          energy_kcal: 240, fat_g: 1.5, saturated_fat_g: 0.3, carbs_g: 42,
          sugars_g: 2, added_sugars_g: 0, fiber_g: 7, protein_g: 9, salt_g: 1.1,
        },
        organic: true, whole_grain_primary: true, origin: 'France',
        named_oils: true, origin_transparent: true,
      },
      ['A+', 'A', 'B'],
      [55, 100],
    );
  });

  it('Céréales chocolatées enfants → D or F', () => {
    const audit = scoreProduct({
      name: 'Céréales chocolatées',
      category: 'breakfast_cereal',
      nova_class: 4,
      ingredients: [
        { name: 'farine de blé', category: 'food' },
        { name: 'sucre', category: 'food' },
        { name: 'cacao maigre', category: 'food' },
        { name: 'huile de palme', category: 'food' },
        { name: 'sirop de glucose', category: 'food' },
        { name: 'dextrose', category: 'food' },
        { name: 'arômes', category: 'additive' },
        { name: 'colorant: caramel', e_number: 'E150', category: 'additive' },
      ],
      nutrition: {
        energy_kcal: 380, fat_g: 4, saturated_fat_g: 2, carbs_g: 80,
        sugars_g: 30, added_sugars_g: 28, fiber_g: 3, protein_g: 6, salt_g: 0.8,
      },
      has_misleading_marketing: true, named_oils: true,
    });
    assert.ok(['C', 'D', 'F'].includes(audit.grade), `Cereals grade ${audit.grade} (score ${audit.score})`);
  });

  it('Saumon frais → A+', () => {
    expectGrade(
      {
        name: 'Filet de saumon frais',
        category: 'fish',
        nova_class: 1,
        ingredients: [{ name: 'saumon atlantique', is_whole_food: true, category: 'food' }],
        nutrition: {
          energy_kcal: 180, fat_g: 12, saturated_fat_g: 2.5, carbs_g: 0,
          sugars_g: 0, fiber_g: 0, protein_g: 20, salt_g: 0.1,
        },
        origin: 'Norvège', named_oils: true, origin_transparent: true,
      },
      ['A+', 'A'],
      [70, 100],
    );
  });
});
