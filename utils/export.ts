
import { Rule } from '../types';

const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToJson = (rules: Rule[]) => {
  const jsonContent = JSON.stringify(rules, null, 2);
  downloadFile(jsonContent, 'rules_export.json', 'application/json');
};

const escapeCsvCell = (cell: any): string => {
    if (cell === null || cell === undefined) {
        return '';
    }
    const cellStr = String(cell);
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
};

export const exportToCsv = (rules: Rule[]) => {
  if (rules.length === 0) return;

  const headers = Object.keys(rules[0]);
  const csvRows = [
    headers.join(','),
    ...rules.map(rule => 
        headers.map(header => escapeCsvCell((rule as any)[header])).join(',')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, 'rules_export.csv', 'text/csv;charset=utf-8;');
};
