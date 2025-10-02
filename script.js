// script.js - manejo de tabla + export JSON/PDF robusto

document.addEventListener('DOMContentLoaded', () => {
    cargarTabla();
    document.getElementById('btnJson').addEventListener('click', exportarJSON);
    document.getElementById('btnPdf').addEventListener('click', exportarPDF);
  });
  
  function cargarTabla() {
    const tbody = document.querySelector('#tablaMatriculados tbody');
    const registros = JSON.parse(localStorage.getItem('matriculasUV')) || [];
    const countSpan = document.getElementById('countRegistro');
    countSpan.textContent = registros.length;
  
    if (registros.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No hay matrículas registradas.</td></tr>`;
      return;
    }
  
    tbody.innerHTML = '';
    registros.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(m.nombre)}</td>
        <td>${escapeHtml(m.dni)}</td>
        <td>${escapeHtml(m.email)}</td>
        <td>${escapeHtml(m.programa)}</td>
        <td>${escapeHtml(m.modalidad)}</td>
        <td>${escapeHtml(m.ciclo)}</td>
        <td>${escapeHtml((m.asignaturas || []).join(', '))}</td>
        <td>${escapeHtml(String(m.creditos || '0'))}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  function exportarJSON() {
    const data = localStorage.getItem('matriculasUV') || '[]';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matriculasUV.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function exportarPDF() {
    console.log('Exportar PDF: iniciando comprobaciones...');
    const registros = JSON.parse(localStorage.getItem('matriculasUV')) || [];
    if (!registros || registros.length === 0) {
      alert('No hay matrículas para exportar.');
      return;
    }
  
    // Detectar constructor jsPDF (varias posibilidades según cómo se cargó la librería)
    let doc;
    try {
      if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
        // caso común con jspdf.umd
        doc = new window.jspdf.jsPDF();
        console.log('Usando window.jspdf.jsPDF');
      } else if (typeof window.jsPDF === 'function') {
        doc = new window.jsPDF();
        console.log('Usando window.jsPDF');
      } else if (typeof window.jsPDF === 'object' && typeof window.jsPDF.jsPDF === 'function') {
        doc = new window.jsPDF.jsPDF();
        console.log('Usando window.jsPDF.jsPDF');
      } else {
        console.error('No se encontró jsPDF. window.jspdf:', window.jspdf, 'window.jsPDF:', window.jsPDF);
        alert('No se encontró jsPDF. Revisa que hayas incluido la librería (ver consola).');
        return;
      }
    } catch (err) {
      console.error('Error al crear el objeto jsPDF:', err);
      alert('Error al inicializar jsPDF. Revisa la consola para más detalles.');
      return;
    }
  
    // Si el plugin autoTable está disponible, usarlo (más presentable)
    if (typeof doc.autoTable === 'function') {
      try {
        doc.setFontSize(16);
        doc.text('Reporte de Matriculados - Universidad Virtual', 14, 15);
        // Usamos la tabla del DOM directamente
        doc.autoTable({
          startY: 25,
          html: '#tablaMatriculados',
          headStyles: { fillColor: [13, 110, 253], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 3 },
          margin: { left: 8, right: 8 },
          didDrawPage: function (data) {
            // opcional: pie de página con número de página
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 8);
          }
        });
        doc.save('matriculasUV.pdf');
        console.log('PDF generado con autoTable correctamente.');
        return;
      } catch (err) {
        console.warn('Error usando autoTable:', err);
        // continúa a intento con doc.html o fallback
      }
    } else {
      console.warn('autoTable no disponible. Intentando doc.html o fallback.');
    }
  
    // Si autoTable no existe, intentar doc.html (html -> canvas -> pdf)
    if (typeof doc.html === 'function') {
      try {
        doc.setFontSize(16);
        doc.text('Reporte de Matriculados - Universidad Virtual', 14, 15);
        const tabla = document.getElementById('tablaMatriculados');
        // doc.html usa html2canvas internamente en muchas builds
        doc.html(tabla, {
          x: 10,
          y: 25,
          html2canvas: { scale: 0.9 },
          callback: function (docFinal) {
            docFinal.save('matriculasUV.pdf');
          },
          margin: [10, 10, 10, 10]
        });
        console.log('PDF generado con doc.html.');
        return;
      } catch (err) {
        console.warn('Error usando doc.html:', err);
      }
    }
  
    // Fallback: generar PDF textual simple (si todo lo demás falló)
    try {
      doc.setFontSize(12);
      let y = 20;
      doc.text('Reporte de Matriculados - Universidad Virtual', 10, y); y += 10;
      registros.forEach((m, idx) => {
        const lines = [
          `${idx + 1}. ${m.nombre} (${m.dni})`,
          `Email: ${m.email}`,
          `Programa: ${m.programa} | ${m.ciclo} | ${m.modalidad}`,
          `Asignaturas: ${(m.asignaturas || []).join(', ')}`,
          `Créditos: ${m.creditos}`,
          '----------------------------------------'
        ];
        lines.forEach(line => {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.text(line, 10, y);
          y += 6;
        });
        y += 2;
      });
      doc.save('matriculasUV.pdf');
      console.log('PDF generado con fallback de texto.');
    } catch (err) {
      console.error('Fallo total generando PDF:', err);
      alert('No se pudo generar el PDF. Revisa la consola para ver detalles.');
    }
  }
  
  // función pequeña para escapar html (seguridad/salida)
  function escapeHtml(text) {
    if (!text && text !== 0) return '';
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  