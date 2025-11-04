import * as XLSX from 'xlsx';
import { Rule, Scope, Provider, FareType, TripKind, FeeType, Currency } from '../types';

const calculateScore = (rule: Partial<Rule>): number => {
  let score = 0;
  if (rule.group) score += 32;
  if (rule.airline && rule.airline !== '*') score += 16;
  if (rule.route_scope && rule.route_scope !== '*') score += 8;
  if (rule.provider && rule.provider !== '*') score += 4;
  if (rule.fare_type && rule.fare_type !== '*') score += 2;
  if (rule.trip_kind && rule.trip_kind !== '*') score += 1;
  return score;
};

const normalizeValue = <T,>(value: any, validValues: T[], defaultValue: T): T => {
    const upperValue = typeof value === 'string' ? value.trim().toUpperCase() : value;
    if (validValues.includes(upperValue)) {
        return upperValue;
    }
    return defaultValue;
};

const normalizeFeeValue = (fee: any): number => {
    if (typeof fee === 'number') return fee;
    if (typeof fee === 'string') {
        const cleanedFee = fee.replace(',', '.').trim();
        const num = parseFloat(cleanedFee);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

export const parseRulesFile = (file: File): Promise<Rule[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    reject(new Error("No data found in file."));
                    return;
                }
                
                let parsedRules: Rule[];

                if (file.name.endsWith('.json')) {
                    parsedRules = JSON.parse(data as string);
                } else {
                    const dataAsString = (typeof data === 'string') 
                        ? data 
                        : new TextDecoder("utf-8").decode(new Uint8Array(data as ArrayBuffer));

                    const workbook = XLSX.read(dataAsString.charCodeAt(0) === 0xFEFF ? dataAsString.slice(1) : dataAsString, { type: 'string' });
                    const sheetName = workbook.SheetNames.find(name => name.toUpperCase() === 'FEEV3') || workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
                    
                    parsedRules = jsonData.map((row, index) => normalizeRowToRule(row, index));
                }

                resolve(parsedRules);

            } catch (error) {
                console.error("Parsing error:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        if (file.name.endsWith('.json')) {
           reader.readAsText(file);
        } else {
           reader.readAsArrayBuffer(file);
        }
    });
};

const normalizeRowToRule = (row: any, index: number): Rule => {
    const flightKindMap: { [key: string]: Scope } = {
        'cabotaje': 'DOM',
        'national': 'DOM',
        'regional': 'REG',
        'inter': 'INT',
        'international': 'INT'
    };
    
    const fareKindMap: { [key: string]: FareType } = {
        'public': 'Pública',
        'private': 'BT',
        'negotiated': 'BT',
        'corporate': 'Corpo',
    };

    const tripKindMap: { [key: string]: TripKind } = {
        'multidestino': 'MULTI',
    };
    
    const route_scope = flightKindMap[row.flightKind?.toLowerCase().trim()] || '*';
    const fare_type: FareType = fareKindMap[row.fareKind?.toLowerCase().trim()] || '*';


    const rawCurrency = row.currency?.toUpperCase() || '*';
    const currency: Currency = rawCurrency === 'ARS' || rawCurrency === 'USD'
        ? rawCurrency
        : (route_scope === 'DOM' ? 'ARS' : (route_scope !== '*' ? 'USD' : '*'));

    const fee_type_val: FeeType = row.operator === 'MUL' ? '%' : 'fixed';

    const notes = [];
    if (row.applyAlways) notes.push("Aplica Siempre");
    if (row.name) notes.push(row.name);

    const partialRule: Partial<Rule> = {
        rule_id: row.id || `R${index + 1}`,
        name: row.name || '',
        airline: row.airline?.toUpperCase() || '*',
        route_scope: route_scope,
        provider: normalizeValue(row.provider, ['GDS', 'NDC'], '*'),
        fare_type: fare_type,
        group: row.group || null,
        fee_type: fee_type_val,
        fee_value: normalizeFeeValue(row.fee),
        currency: currency,
        excludes_groups: (row.agencyGroupToExclude || '').split(/[,;|\-]/).map((g: string) => g.trim().toUpperCase()).filter(Boolean),
        trip_kind: tripKindMap[row.flightTripKind?.toLowerCase().trim()] || normalizeValue(row.flightTripKind, ['RT', 'OW'], '*'),
        notes: notes.join(' | '),
        priority_manual: parseInt(row.priorityManual, 10) || 0,
        source_tab: 'FEE v3',
        source_row: index + 2,
        status: 'ok',
    };
    
    partialRule.priority = calculateScore(partialRule);

    return partialRule as Rule;
}