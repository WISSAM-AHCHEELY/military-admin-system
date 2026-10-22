// reports.js — تقارير حقيقية مبنية من البيانات الفعلية (لا أرقام ثابتة) + تصدير CSV

// يبني تقرير القوة: عدد حسب الفئة/الرتبة/الوحدة/الحالة — كله من قائمة منتسبين حقيقية
// categoryLabels/statusLabels: خرائط الترجمة لعرض تسميات عربية بدل القيم البرمجية الخام (officer/present/...)
export function buildStrengthReport(personnelList, unitsList, categoryLabels = {}, statusLabels = {}) {
  const byCategory = {};
  const byRank = {};
  const byUnit = {};
  const byStatus = {};
  const unitNameById = {};
  unitsList.forEach((u) => { unitNameById[u.id] = u.name; });

  personnelList.forEach((p) => {
    const cat = categoryLabels[p.category] || p.category || 'غير محدد';
    const rank = p.rank || 'غير محدد';
    const unitName = unitNameById[p.unitId] || 'بدون وحدة';
    const status = statusLabels[p.status] || p.status || 'غير محدد';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    byRank[rank] = (byRank[rank] || 0) + 1;
    byUnit[unitName] = (byUnit[unitName] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  return { total: personnelList.length, byCategory, byRank, byUnit, byStatus };
}

// يحوّل مصفوفة كائنات إلى CSV حقيقي (متوافق مع Excel) ويبدأ تنزيله فورًا
export function exportToCSV(rows, columns, filename) {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key] ?? '';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  );
  // BOM حتى يفتح Excel/Sheets الملف بالعربية صحيحة بدون رموز غريبة
  const csvContent = '\uFEFF' + [header, ...lines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
