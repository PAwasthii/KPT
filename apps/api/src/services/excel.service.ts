import ExcelJS from 'exceljs';

export type ExportEntity = 'leads' | 'contacts' | 'accounts';

export class ExcelService {
  createWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    return workbook;
  }

  autosizeColumns(worksheet: ExcelJS.Worksheet) {
    worksheet.columns?.forEach((column) => {
      let maxLength = 10;
      column?.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value as string | number | Date | null | undefined;
        const cellText = cellValue == null ? '' : String(cellValue);
        maxLength = Math.max(maxLength, cellText.length + 2);
      });
      if (column) {
        column.width = Math.min(60, maxLength);
      }
    });
  }
}



