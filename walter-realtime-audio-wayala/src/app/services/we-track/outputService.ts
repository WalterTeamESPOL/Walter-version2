/**
 * Service for generating output files (Excel and PNG)
 */
import ExcelJS from 'exceljs';
import { config } from './config';

type DataRecord = Record<string, any>;

class OutputService {
  private readonly PNG_THRESHOLD = config.output.pngThreshold;

  shouldUseExcel(data: DataRecord[]): boolean {
    return data.length > this.PNG_THRESHOLD;
  }

  private formatValue(value: any): any {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value;
      return Math.round(value * 100) / 100; // Round to 2 decimals
    }
    return value;
  }

  async generateExcel(data: DataRecord[]): Promise<{ buffer: Buffer; rowCount: number; columnCount: number }> {
    if (!data || data.length === 0) {
      throw new Error('No data provided for Excel generation');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');

    // Get all unique keys from data
    const allKeys = new Set<string>();
    data.forEach((record) => {
      Object.keys(record).forEach((key) => allKeys.add(key));
    });
    const columns = Array.from(allKeys);

    // Set headers
    worksheet.columns = columns.map((key) => ({
      header: key,
      key,
      width: 15,
    }));

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E86AB' },
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

    // Add data rows
    data.forEach((record) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col] = this.formatValue(record[col]);
      });
      worksheet.addRow(row);
    });

    // Auto-adjust column widths
    worksheet.columns.forEach((column) => {
      if (column.header && column.eachCell) {
        let maxLength = column.header.length;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellLength = cell.value ? String(cell.value).length : 10;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    return {
      buffer: Buffer.from(buffer),
      rowCount: data.length,
      columnCount: columns.length,
    };
  }

  async generatePNG(data: DataRecord[], title: string = 'Resultados de la Consulta'): Promise<{ buffer: Buffer; rowCount: number; columnCount: number }> {
    // For now, generate a simple HTML table and convert to PNG
    // You can enhance this later with better styling
    
    if (!data || data.length === 0) {
      throw new Error('No data provided for PNG generation');
    }

    // Get all unique keys
    const allKeys = new Set<string>();
    data.forEach((record) => {
      Object.keys(record).forEach((key) => allKeys.add(key));
    });
    const columns = Array.from(allKeys).slice(0, 8); // Limit to 8 columns for PNG

    // Generate HTML table (for future PNG implementation)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background: white;
    }
    h1 {
      color: #2E86AB;
      font-size: 16px;
      margin-bottom: 20px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 10px;
    }
    th {
      background-color: #2E86AB;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #1A5F7A;
    }
    td {
      padding: 8px;
      border: 1px solid #E0E0E0;
    }
    tr:nth-child(even) {
      background-color: #F8F9FA;
    }
    tr:nth-child(odd) {
      background-color: white;
    }
  </style>
</head>
<body>
  <h1>${title.length > 80 ? title.substring(0, 77) + '...' : title}</h1>
  <table>
    <thead>
      <tr>
        ${columns.map((col) => `<th>${col}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data
        .slice(0, 50) // Limit to 50 rows for PNG
        .map(
          (record) =>
            `<tr>${columns.map((col) => `<td>${this.formatValue(record[col] ?? '')}</td>`).join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>
    `;

    // Use node-html-to-image or similar to convert HTML to PNG
    // For now, return a placeholder or throw error
    // You'll need to install and use node-html-to-image
    
    throw new Error('PNG generation not yet implemented. Use Excel for now.');

    // TODO: Implement PNG generation using node-html-to-image
    // const image = await nodeHtmlToImage({
    //   html,
    //   type: 'png',
    //   quality: 100,
    //   width: 1200,
    // });
    
    // return {
    //   buffer: Buffer.from(image),
    //   rowCount: data.length,
    //   columnCount: columns.length,
    // };
  }

  toBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }
}

// Singleton instance
export const outputService = new OutputService();

