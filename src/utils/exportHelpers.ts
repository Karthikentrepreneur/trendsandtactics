import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToCSV = (data: any[], filename: string, comparisonMode = false) => {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  let csvContent = '';
  
  if (comparisonMode && data[0].comparisonApproved !== undefined) {
    // Side-by-side comparison format
    const headers = Object.keys(data[0]).filter(key => !key.startsWith('comparison'));
    const comparisonHeaders = Object.keys(data[0]).filter(key => key.startsWith('comparison'));
    
    csvContent = [
      'Period,' + headers.join(',') + ',' + comparisonHeaders.map(h => h.replace('comparison', 'Comparison ')).join(','),
      ...data.map(row => {
        const currentValues = headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        const comparisonValues = comparisonHeaders.map(header => row[header] || 0);
        return 'Current,' + currentValues.join(',') + ',' + comparisonValues.join(',');
      })
    ].join('\n');
  } else {
    // Standard format
    const headers = Object.keys(data[0]);
    csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: any[], filename: string, title: string, comparisonMode = false) => {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
  
  let startY = 35;
  
  if (comparisonMode && data[0].comparisonApproved !== undefined) {
    // Side-by-side comparison format
    const baseHeaders = Object.keys(data[0]).filter(key => !key.startsWith('comparison'));
    const comparisonHeaders = Object.keys(data[0]).filter(key => key.startsWith('comparison'));
    
    // Current Period Table
    doc.setFontSize(12);
    doc.text('Current Period', 14, startY);
    startY += 5;
    
    const currentTableData = data.map(row => baseHeaders.map(header => row[header]));
    
    autoTable(doc, {
      head: [baseHeaders],
      body: currentTableData,
      startY: startY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });
    
    startY = (doc as any).lastAutoTable.finalY + 10;
    
    // Comparison Period Table
    doc.setFontSize(12);
    doc.text('Comparison Period', 14, startY);
    startY += 5;
    
    const comparisonTableHeaders = ['Period', ...comparisonHeaders.map(h => h.replace('comparison', ''))];
    const comparisonTableData = data.map(row => 
      [row[baseHeaders[0]], ...comparisonHeaders.map(header => row[header] || 0)]
    );
    
    autoTable(doc, {
      head: [comparisonTableHeaders],
      body: comparisonTableData,
      startY: startY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [139, 92, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });
  } else {
    // Standard format
    const headers = Object.keys(data[0]);
    const tableData = data.map(row => headers.map(header => row[header]));
    
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: startY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });
  }
  
  doc.save(`${filename}.pdf`);
};
