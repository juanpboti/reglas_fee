import { Rule, TestCase } from './types';

export const AIRLINES_WITH_TRIP_KIND = ['LA'];

export const AGENCY_GROUPS = ['A', 'B', 'C', 'E', 'F', 'G', 'J', 'L', 'O', 'W', 'X', 'Y', 'CARNIVAL'];

export const DEFAULT_RULE: Rule = {
  rule_id: 'DEFAULT_0',
  name: 'Default Fallback Rule',
  airline: '*',
  route_scope: '*',
  provider: '*',
  fare_type: '*',
  group: null,
  fee_type: 'fixed',
  fee_value: 0,
  currency: '*',
  excludes_groups: [],
  trip_kind: '*',
  notes: 'Regla por defecto aplicada cuando ninguna otra coincide.',
  priority: -1,
  priority_manual: -1,
  source_tab: 'DEFAULT',
  source_row: null,
  status: 'ok',
};

export const SOURCE_PRIORITY_MAP: { [key: string]: number } = {
  'Detalle': 4,
  'Planilla': 3,
  'FEE v3': 2,
  'DEFAULT': 1,
};

export const TEST_CASES: TestCase[] = [
    // T01-T10 from original context (simulated)
    {
      id: "T01",
      description: "Match GDS Público Cabotaje",
      input: { group: "G1", provider: "GDS", fare_type: "Pública", airline: "AR", route_scope: "DOM", trip_kind: "*" },
      rules: [{ rule_id: "R1", provider: "GDS", fare_type: "Pública", route_scope: "DOM", fee_value: 10, source_tab: "FEE v3" }],
      expected_rule_id: "R1"
    },
    {
      id: "T02",
      description: "Match NDC, score should win over wildcard",
      input: { group: "G1", provider: "NDC", fare_type: "Pública", airline: "AR", route_scope: "DOM", trip_kind: "*" },
      rules: [
        { rule_id: "R1", provider: "*", fee_value: 5, source_tab: "FEE v3" },
        { rule_id: "R2", provider: "NDC", fee_value: 10, source_tab: "FEE v3" }
      ],
      expected_rule_id: "R2"
    },
    // T11 y T12
    {
      id: "T11",
      description: "priority_manual debe ganar sobre score",
      input: { group: "G1", provider: "GDS", fare_type: "Pública", airline: "AR", route_scope: "DOM", trip_kind: "*" },
      rules: [
        { rule_id: "SCORE_WINS", provider: "GDS", airline: "AR", fare_type: "Pública", route_scope: "DOM", fee_value: 100, source_tab: "FEE v3" }, // Score alto
        { rule_id: "MANUAL_WINS", provider: "*", fee_value: 200, priority_manual: 10, source_tab: "FEE v3" } // Score bajo pero manual alto
      ],
      expected_rule_id: "MANUAL_WINS"
    },
    {
      id: "T12",
      description: "Sin priority_manual, score debe ganar",
      input: { group: "G1", provider: "GDS", fare_type: "Pública", airline: "AR", route_scope: "DOM", trip_kind: "*" },
      rules: [
        { rule_id: "SCORE_LOSES", provider: "*", fee_value: 200, source_tab: "FEE v3" }, // Score bajo
        { rule_id: "SCORE_WINS", provider: "GDS", airline: "AR", fare_type: "Pública", route_scope: "DOM", fee_value: 100, source_tab: "FEE v3" } // Score alto
      ],
      expected_rule_id: "SCORE_WINS"
    },
    // Nuevos tests
    {
      id: "T13",
      description: "Una regla con airline='*' debe matchear una aerolínea específica",
      input: { group: "G1", provider: "GDS", fare_type: "Pública", airline: "LA", route_scope: "INT", trip_kind: "*" },
      rules: [
        { rule_id: "R_WILDCARD_AIRLINE", airline: "*", route_scope: "INT", fee_value: 50, source_tab: "FEE v3" }
      ],
      expected_rule_id: "R_WILDCARD_AIRLINE"
    },
    {
      id: "T14",
      description: "Una regla con scope='*' debe matchear un ámbito específico (DOM)",
      input: { group: "G1", provider: "GDS", fare_type: "Pública", airline: "AR", route_scope: "DOM", trip_kind: "*" },
      rules: [
        { rule_id: "R_SPECIFIC_SCOPE", route_scope: "DOM", fee_value: 10, source_tab: "FEE v3" },
        { rule_id: "R_WILDCARD_SCOPE", route_scope: "*", fee_value: 5, source_tab: "FEE v3" }
      ],
      expected_rule_id: "R_SPECIFIC_SCOPE"
    },
    {
      id: "T15",
      description: "Empate de score y manual resuelto por source_tab",
      input: { group: "G1", provider: "GDS", fare_type: "Pública", airline: "AR", route_scope: "DOM", trip_kind: "*" },
      rules: [
        { rule_id: "R_FEEV3", airline: "AR", fee_value: 10, source_tab: "FEE v3" },
        { rule_id: "R_DETALLE", airline: "AR", fee_value: 20, source_tab: "Detalle" } // Detalle > FEE v3
      ],
      expected_rule_id: "R_DETALLE"
    },
    {
      id: "T16",
      description: "Empate total resuelto por rule_id ASC",
      input: { group: "G1", provider: "GDS", fare_type: "Pública", airline: "AR", route_scope: "DOM", trip_kind: "*" },
      rules: [
        { rule_id: "Z_RULE", airline: "AR", fee_value: 99, source_tab: "FEE v3" },
        { rule_id: "A_RULE", airline: "AR", fee_value: 100, source_tab: "FEE v3" }
      ],
      expected_rule_id: "A_RULE"
    }
  ];