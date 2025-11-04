
export type Scope = "DOM" | "REG" | "INT" | "*";
export type Provider = "GDS" | "NDC" | "*";
export type FareType = "Pública" | "BT" | "Corpo" | "*";
export type TripKind = "RT" | "OW" | "MULTI" | "*";
export type FeeType = "%" | "fixed";
export type Currency = "ARS" | "USD" | "*";

export interface Rule {
  rule_id: string;
  name?: string;
  airline: string; // IATA or "*"
  route_scope: Scope;
  provider: Provider;
  fare_type: FareType;
  group: string | null; // null => todos los grupos
  fee_type: FeeType;
  fee_value: number;
  currency: Currency;
  excludes_groups: string[];
  trip_kind?: TripKind;
  notes: string;
  priority: number; // score calculado
  priority_manual?: number; // MANUAL PRIMERO (entero, mayor gana)
  source_tab: string;
  source_row: number | null;
  status: "ok" | "conflicto" | "incompleto" | string;
}

export interface CalculationInput {
  group: string;
  provider: Provider;
  fare_type: FareType;
  airline: string;
  route_scope: Scope;
  trip_kind: TripKind;
}

export interface CalculationResult {
  bestRule: Rule | null;
  matchingRules: Rule[];
}

export interface TestCase {
  id: string;
  description: string;
  input: CalculationInput;
  rules: Partial<Rule>[];
  expected_rule_id: string | null;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  actual_rule_id: string | null;
}
