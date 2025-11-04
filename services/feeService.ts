import { Rule, CalculationInput, CalculationResult } from '../types';
import { DEFAULT_RULE, SOURCE_PRIORITY_MAP } from '../constants';

export const findBestRule = (rules: Rule[], input: CalculationInput): CalculationResult => {
  const matchingRules = rules.filter(rule => {
    const airlineMatch = rule.airline === '*' || rule.airline === input.airline;
    const providerMatch = rule.provider === '*' || rule.provider === input.provider;
    const fareTypeMatch = rule.fare_type === '*' || rule.fare_type === input.fare_type;
    const scopeMatch = rule.route_scope === '*' || rule.route_scope === input.route_scope;
    const groupMatch = !rule.excludes_groups.includes(input.group); // Rule applies if group is NOT excluded
    const tripKindMatch = !rule.trip_kind || rule.trip_kind === '*' || rule.trip_kind === input.trip_kind;
    const statusMatch = rule.status === 'ok';

    return airlineMatch && providerMatch && fareTypeMatch && scopeMatch && groupMatch && tripKindMatch && statusMatch;
  });

  if (matchingRules.length === 0) {
    return { bestRule: DEFAULT_RULE, matchingRules: [] };
  }

  matchingRules.sort((a, b) => {
    // 1. Priority Manual (desc)
    const priorityManualA = a.priority_manual || 0;
    const priorityManualB = b.priority_manual || 0;
    if (priorityManualA !== priorityManualB) {
      return priorityManualB - priorityManualA;
    }

    // 2. Score (desc)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // 3. Source Tab (desc by mapped value)
    const sourcePriorityA = SOURCE_PRIORITY_MAP[a.source_tab] || 0;
    const sourcePriorityB = SOURCE_PRIORITY_MAP[b.source_tab] || 0;
    if (sourcePriorityA !== sourcePriorityB) {
        return sourcePriorityB - sourcePriorityA;
    }

    // 4. Rule ID (asc)
    return a.rule_id.localeCompare(b.rule_id);
  });

  return { bestRule: matchingRules[0], matchingRules };
};