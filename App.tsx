
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Rule, CalculationInput, CalculationResult, TestResult, Provider, FareType, Scope, TripKind } from './types';
import { findBestRule } from './services/feeService';
import { parseRulesFile } from './services/parserService';
import { AIRLINES_WITH_TRIP_KIND, TEST_CASES, DEFAULT_RULE, AGENCY_GROUPS } from './constants';
import { exportToCsv, exportToJson } from './utils/export';
import { Icon } from './components/Icon';

const Header: React.FC<{ onFileLoaded: (rules: Rule[]) => void; setIsLoading: (loading: boolean) => void; isAdmin: boolean; }> = ({ onFileLoaded, setIsLoading, isAdmin }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const rules = await parseRulesFile(file);
            onFileLoaded(rules);
        } catch (error) {
            alert(`Error al procesar el archivo: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
            if(event.target) event.target.value = ''; // Reset file input
        }
    };
    
    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <header className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold leading-tight text-slate-900">Fee Finder</h1>
                    <p className="text-sm text-slate-500">Calculadora de fees para agencias de viaje B2B</p>
                </div>
                {isAdmin && (
                    <div>
                         <input id="file-upload" type="file" className="hidden" accept=".csv, .xlsx, .json" onChange={handleFileChange} ref={fileInputRef} />
                         <button onClick={handleButtonClick} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <Icon name="upload" className="w-5 h-5 mr-2" />
                            Cargar Reglas
                         </button>
                    </div>
                )}
            </div>
        </header>
    );
};

const FeeCalculatorForm: React.FC<{ 
    input: CalculationInput; 
    setInput: (input: CalculationInput) => void; 
    showTripKind: boolean;
    errors: Record<string, string>;
    onCalculate: () => void;
}> = ({ input, setInput, showTripKind, errors, onCalculate }) => {
    const handleChange = <K extends keyof CalculationInput,>(key: K, value: CalculationInput[K]) => {
        setInput({ ...input, [key]: value });
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">1. Calcular Fee</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Grupo</label>
                    <select value={input.group} onChange={(e) => handleChange('group', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white">
                        {AGENCY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Proveedor</label>
                    <select value={input.provider} onChange={(e) => handleChange('provider', e.target.value as Provider)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white">
                        <option value="GDS">GDS</option>
                        <option value="NDC">NDC</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Tipo de Tarifa</label>
                    <select value={input.fare_type} onChange={(e) => handleChange('fare_type', e.target.value as FareType)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white">
                        <option value="Pública">Pública</option>
                        <option value="BT">BT</option>
                        <option value="Corpo">Corpo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Cía Aérea (IATA)</label>
                    <input 
                        type="text" 
                        value={input.airline} 
                        onChange={(e) => handleChange('airline', e.target.value.toUpperCase())} 
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm bg-white ${errors.airline ? 'border-red-500 ring-red-500' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'}`} 
                        maxLength={2} 
                     />
                     {errors.airline && <p className="mt-1 text-xs text-red-600">{errors.airline}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Ámbito</label>
                    <select value={input.route_scope} onChange={(e) => handleChange('route_scope', e.target.value as Scope)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white">
                        <option value="DOM">Cabotaje (DOM)</option>
                        <option value="REG">Regional (REG)</option>
                        <option value="INT">Internacional (INT)</option>
                    </select>
                </div>
                {showTripKind && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Tipo de Viaje</label>
                        <select value={input.trip_kind} onChange={(e) => handleChange('trip_kind', e.target.value as TripKind)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white">
                            <option value="*">*</option>
                            <option value="RT">RT</option>
                            <option value="OW">OW</option>
                            <option value="MULTI">MULTI</option>
                        </select>
                    </div>
                )}
            </div>
            <div className="mt-6">
                <button 
                    onClick={onCalculate}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Calcular Fee
                </button>
            </div>
        </div>
    );
};

const FeeResult: React.FC<{ result: CalculationResult | null; onShowTrace: () => void }> = ({ result, onShowTrace }) => {
    if (!result) {
        return (
             <div className="p-6 bg-white rounded-lg shadow h-full flex flex-col justify-center items-center">
                <div className="text-center text-slate-500">
                    <Icon name="search" className="mx-auto h-12 w-12 text-slate-400"/>
                    <h3 className="mt-2 text-sm font-medium text-slate-900">Esperando cálculo</h3>
                    <p className="mt-1 text-sm text-slate-500">Complete el formulario y presione "Calcular Fee".</p>
                </div>
            </div>
        );
    }

    const { bestRule } = result;

    if (!bestRule) { // This case should ideally not happen if DEFAULT_RULE is always a fallback
        return <div className="p-6 bg-white rounded-lg shadow text-center text-slate-500">Error en el cálculo.</div>;
    }

    const isDefault = bestRule.rule_id === DEFAULT_RULE.rule_id;
    const feeDisplay = bestRule.fee_type === '%' ? `${bestRule.fee_value}%` : `${bestRule.fee_value} ${bestRule.currency !== '*' ? bestRule.currency : ''}`;

    return (
        <div className="p-6 bg-white rounded-lg shadow h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">2. Resultado</h2>
            <div className="flex-grow flex flex-col justify-center">
                <div className={`text-center p-6 rounded-lg ${isDefault ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} border`}>
                    <p className="text-sm font-medium text-slate-500">Fee Aplicable</p>
                    <p className={`text-4xl font-bold ${isDefault ? 'text-amber-600' : 'text-green-700'}`}>{feeDisplay.trim()}</p>
                    <p className="text-xs text-slate-400 mt-1">Regla aplicada: {bestRule.rule_id}</p>
                </div>
            </div>
            <div className="mt-4 flex flex-col items-center">
                <button onClick={onShowTrace} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <Icon name="eye" className="w-4 h-4 mr-2"/>
                    Ver cómo se calculó
                </button>
                <p className="text-center text-xs text-slate-500 mt-4 italic">En caso de que la tarifa tenga over, no aplica el fee.</p>
            </div>
        </div>
    );
};


const TraceabilityModal: React.FC<{ result: CalculationResult; onClose: () => void; }> = ({ result, onClose }) => {
    const { bestRule, matchingRules } = result;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">Trazabilidad del Cálculo</h3>
                </div>
                <div className="p-6">
                    <div className="mb-6">
                        <h4 className="font-semibold mb-2">Regla Ganadora</h4>
                        {bestRule ? (
                            <div className="bg-green-50 p-4 rounded-md text-sm">
                                <p><strong>ID:</strong> {bestRule.rule_id}</p>
                                <p><strong>Fuente:</strong> {bestRule.source_tab} (Fila: {bestRule.source_row || 'N/A'})</p>
                                <p><strong>Prioridad Manual:</strong> {bestRule.priority_manual}</p>
                                <p><strong>Score Especificidad:</strong> {bestRule.priority}</p>
                                <p><strong>Notas:</strong> {bestRule.notes || 'N/A'}</p>
                            </div>
                        ) : <p>No se encontró una regla ganadora.</p>}
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Candidatos Evaluados ({matchingRules.length})</h4>
                        <div className="space-y-2 text-xs">
                            {matchingRules.map((rule, index) => (
                                <div key={rule.rule_id} className={`p-3 rounded-md ${rule.rule_id === bestRule?.rule_id ? 'bg-slate-100 border border-slate-300' : 'bg-slate-50'}`}>
                                    <p><strong>{index + 1}. ID: {rule.rule_id}</strong> (Manual: {rule.priority_manual}, Score: {rule.priority}, Fuente: {rule.source_tab})</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

const RulesTable: React.FC<{ rules: Rule[]; }> = ({ rules }) => {
    const [filter, setFilter] = useState('');
    const filteredRules = useMemo(() => {
        if (!filter) return rules;
        const lowerFilter = filter.toLowerCase();
        return rules.filter(rule => Object.values(rule).some(val => String(val).toLowerCase().includes(lowerFilter)));
    }, [rules, filter]);

    const headers = [
      'rule_id', 'name', 'group', 'airline', 'route_scope', 'provider', 'fare_type', 'trip_kind', 
      'fee_type', 'fee_value', 'currency', 'priority', 'priority_manual', 'source_tab', 'status', 'notes'
    ];

    if (rules.length === 0) {
        return (
            <div className="text-center text-slate-500 py-8">
                <p>No hay reglas cargadas. Use el botón "Cargar Reglas" en el encabezado (disponible en modo admin).</p>
            </div>
        );
    }
    
    return (
        <div className="pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full sm:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="search" className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="text" placeholder="Filtrar reglas..." value={filter} onChange={e => setFilter(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportToCsv(filteredRules)} className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                       <Icon name="download" className="w-4 h-4 mr-2" /> CSV
                    </button>
                    <button onClick={() => exportToJson(filteredRules)} className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                       <Icon name="download" className="w-4 h-4 mr-2" /> JSON
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            {headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 text-sm">
                        {filteredRules.map(rule => (
                            <tr key={rule.rule_id} className="hover:bg-slate-50">
                                {headers.map(h => <td key={`${rule.rule_id}-${h}`} className="px-6 py-4 whitespace-nowrap">{String((rule as any)[h] ?? '')}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const TestRunner: React.FC<{ rules: Rule[]; }> = ({ rules }) => {
    const [results, setResults] = useState<TestResult[]>([]);

    const runTests = useCallback(() => {
        if (rules.length === 0) {
            alert("Cargue un archivo de reglas antes de ejecutar los tests.");
            return;
        }

        const testResults = TEST_CASES.map(testCase => {
            const rulesForTest = testCase.rules.map((r, i) => ({
                ...DEFAULT_RULE,
                rule_id: `T${testCase.id}-R${i + 1}`,
                ...r
            })) as Rule[];

            const allRulesForTest = [...rules, ...rulesForTest];

            const result = findBestRule(allRulesForTest, testCase.input);
            const actual_rule_id = result.bestRule?.rule_id ?? null;
            const passed = actual_rule_id === testCase.expected_rule_id;

            return { testCase, passed, actual_rule_id };
        });
        setResults(testResults);
    }, [rules]);

    return (
        <div className="pt-4">
            <div className="flex justify-end items-center mb-4">
                <button onClick={runTests} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    <Icon name="play" className="w-5 h-5 mr-2" />
                    Ejecutar Tests
                </button>
            </div>
            {results.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.map(({ testCase, passed, actual_rule_id }) => (
                        <div key={testCase.id} className={`flex items-start p-3 rounded-md border ${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className={`mr-3 mt-1 ${passed ? 'text-green-500' : 'text-red-500'}`}>
                                {passed ? <Icon name="check" className="w-5 h-5" /> : <Icon name="cross" className="w-5 h-5" />}
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold">{testCase.id}: {testCase.description}</p>
                                {passed ? (
                                    <p className="text-green-700">OK: Se resolvió a <span className="font-mono">{testCase.expected_rule_id}</span></p>
                                ) : (
                                    <p className="text-red-700">FALLÓ: Esperado <span className="font-mono">{testCase.expected_rule_id || 'null'}</span>, obtenido <span className="font-mono">{actual_rule_id || 'null'}</span></p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CollapsibleSection: React.FC<{ title: React.ReactNode, children: React.ReactNode, initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);

    return (
        <div className="bg-white rounded-lg shadow">
            <button
                className="flex justify-between items-center w-full p-6 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <h2 className="text-xl font-semibold">{title}</h2>
                <Icon name="chevron-down" className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-6 pb-6 border-t border-slate-200 -mt-px">
                    {children}
                </div>
            )}
        </div>
    );
};


export default function App() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [input, setInput] = useState<CalculationInput>({
        group: AGENCY_GROUPS[0],
        provider: 'GDS',
        fare_type: 'Pública',
        airline: '',
        route_scope: 'DOM',
        trip_kind: '*',
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
    const [showTraceModal, setShowTraceModal] = useState(false);

    useEffect(() => {
      // Check for admin mode
      const queryParams = new URLSearchParams(window.location.search);
      setIsAdmin(queryParams.get('mode') === 'admin');

      // Load rules from localStorage
      try {
        const storedRules = localStorage.getItem('fee_finder_rules');
        if (storedRules) {
          setRules(JSON.parse(storedRules));
        }
      } catch (error) {
        console.error("Failed to load rules from localStorage", error);
        localStorage.removeItem('fee_finder_rules');
      }
    }, []);

    const handleFileLoaded = (loadedRules: Rule[]) => {
        setRules(loadedRules);
        try {
            localStorage.setItem('fee_finder_rules', JSON.stringify(loadedRules));
            alert(`${loadedRules.length} reglas cargadas y guardadas localmente.`);
        } catch (error) {
            console.error("Failed to save rules to localStorage", error);
            alert("Error al guardar las reglas en el almacenamiento local.");
        }
    };

    const handleCalculate = useCallback(() => {
        const errors: Record<string, string> = {};
        if (input.airline.length !== 2) {
            errors.airline = 'El código IATA debe tener 2 caracteres.';
        }
        // Add more validations here if needed

        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            setCalculationResult(null); // Clear previous results if validation fails
            return;
        }

        if (rules.length === 0) {
            alert("No hay reglas cargadas. Un administrador debe cargar un archivo de reglas usando el modo admin.");
            setCalculationResult({ bestRule: DEFAULT_RULE, matchingRules: [] });
            return;
        }

        const result = findBestRule(rules, input);
        setCalculationResult(result);
    }, [input, rules]);

    const showTripKind = useMemo(() => AIRLINES_WITH_TRIP_KIND.includes(input.airline.toUpperCase()), [input.airline]);

    return (
        <>
            <Header onFileLoaded={handleFileLoaded} setIsLoading={setIsLoading} isAdmin={isAdmin} />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {isLoading && (
                    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
                        <p className="text-lg font-semibold">Procesando archivo...</p>
                    </div>
                )}

                <div className="px-4 py-6 sm:px-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
                        <FeeCalculatorForm 
                            input={input} 
                            setInput={setInput} 
                            showTripKind={showTripKind} 
                            errors={validationErrors}
                            onCalculate={handleCalculate}
                        />
                        <FeeResult 
                            result={calculationResult} 
                            onShowTrace={() => setShowTraceModal(true)} 
                        />
                    </div>
                    
                    <div className="space-y-6">
                        <CollapsibleSection title={<>Catálogo de Reglas <span className="text-base font-normal text-slate-500">({rules.length})</span></>}>
                           <RulesTable rules={rules} />
                        </CollapsibleSection>

                        <CollapsibleSection title="Runner de Tests">
                           <TestRunner rules={rules} />
                        </CollapsibleSection>
                    </div>
                </div>

                {showTraceModal && calculationResult && (
                    <TraceabilityModal result={calculationResult} onClose={() => setShowTraceModal(false)} />
                )}
            </main>
        </>
    );
}
