// cloudinary.js — رفع ملفات حقيقي عبر Cloudinary (Unsigned Upload)
// بديل Firebase Storage لتفادي متطلب خطة Blaze المدفوعة — نفس أسلوب مشروع أچيلي
const CLOUD_NAME = 'b6vhrmhx';
const UPLOAD_PRESET = 'military_admin_upload';

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

// يرفع ملفًا (صورة أو مستند) ويعيد رابطه الحقيقي (secure_url) بعد اكتمال الرفع فعليًا
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`فشل الرفع إلى Cloudinary (${response.status}): ${errText || 'تحقق من اسم الـ Cloud/Preset'}`);
  }
  const data = await response.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
    bytes: data.bytes
  };
}
