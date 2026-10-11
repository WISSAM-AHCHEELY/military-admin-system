// permissions.js — مصفوفة الأدوار والصلاحيات (نفس المنطق مكرّر عمداً في firestore.rules
// لأن فرض الصلاحية الحقيقي يكون في قاعدة البيانات، وهذا الملف فقط لتكييف الواجهة)

export const ROLES = {
  super_admin:     'Super Admin',
  unit_manager:    'مدير الوحدة',
  admin_branch:    'شعبة الإدارة',
  personnel_branch:'شعبة الأفراد',
  training_branch: 'شعبة التدريب',
  finance_branch:  'شعبة الحسابات',
  data_entry:      'مسؤول إدخال',
  viewer:          'مشاهد فقط'
};

const MATRIX = {
  super_admin:      { view: true, create: true,  edit: true,  delete: true,  export: true, print: true, manage_users: true,  manage_settings: true },
  unit_manager:      { view: true, create: true,  edit: true,  delete: true,  export: true, print: true, manage_users: false, manage_settings: false },
  admin_branch:      { view: true, create: true,  edit: true,  delete: false, export: true, print: true, manage_users: false, manage_settings: false },
  personnel_branch:  { view: true, create: true,  edit: true,  delete: false, export: true, print: true, manage_users: false, manage_settings: false },
  training_branch:   { view: true, create: true,  edit: true,  delete: false, export: true, print: true, manage_users: false, manage_settings: false },
  finance_branch:    { view: true, create: false, edit: false, delete: false, export: true, print: true, manage_users: false, manage_settings: false },
  data_entry:        { view: true, create: true,  edit: true,  delete: false, export: false, print: false, manage_users: false, manage_settings: false },
  viewer:            { view: true, create: false, edit: false, delete: false, export: false, print: false, manage_users: false, manage_settings: false }
};

// هل يملك هذا المستخدم (profile من users/{uid}) صلاحية action؟
export function can(profile, action) {
  if (!profile || profile.active !== true) return false;
  const perms = MATRIX[profile.role];
  return !!(perms && perms[action]);
}
