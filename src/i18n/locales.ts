import { authMessages } from './auth'
import { adminUsersMessages } from './adminUsers'
import { adminDBKVMessages } from './adminDBKV'

export const languageConfig = {
  defaultLanguage: 'en',
  storageKey: 'lzapp-language',
  languages: [
    { code: 'en', label: 'English', dir: 'ltr' },
    { code: 'zh-CN', label: '简体中文', dir: 'ltr' },
    { code: 'es', label: 'Español', dir: 'ltr' },
    { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
    { code: 'fr', label: 'Français', dir: 'ltr' },
    { code: 'ar', label: 'العربية', dir: 'rtl' }
  ]
} as const

export type LanguageCode = typeof languageConfig.languages[number]['code']

export const english = {
  ...authMessages.en,
  ...adminUsersMessages.en,
  ...adminDBKVMessages.en,
  home: 'Home',
  notFoundTitle: 'Page not found',
  notFoundDescription: 'This page does not exist or has been moved.',
  notFoundHome: 'Back to home',
  admin: 'Admin',
  users: 'Users',
  settings: 'Settings',
  changePassword: 'Change password',
  apiDocs: 'API docs',
  exit: 'Log out',
  language: 'Language',
  lightMode: 'Light mode',
  darkMode: 'Dark mode',
  brandHome: 'LZApp home',
  navigationTitle: 'Navigation',
  navigationDescription: 'Main navigation',
  dashboardDescription: 'LZApp dashboard',
  notifications: 'Notifications',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode'
}

export type TranslationKey = keyof typeof english

export const messages: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: english,
  'zh-CN': {
    ...authMessages['zh-CN'],
    ...adminUsersMessages['zh-CN'],
    ...adminDBKVMessages['zh-CN'],
    home: '首页',
    notFoundTitle: '页面未找到',
    notFoundDescription: '此页面不存在或已被移动。',
    notFoundHome: '返回首页',
    admin: '管理',
    users: '用户',
    settings: '设置',
    changePassword: '修改密码',
    apiDocs: 'API 文档',
    exit: '退出登录',
    language: '语言',
    lightMode: '浅色模式',
    darkMode: '深色模式',
    brandHome: 'LZApp 首页',
    navigationTitle: '导航',
    navigationDescription: '主导航',
    dashboardDescription: 'LZApp 控制台',
    notifications: '通知',
    switchToLight: '切换到浅色模式',
    switchToDark: '切换到深色模式'
  },
  es: {
    ...authMessages.es,
    ...adminUsersMessages.es,
    ...adminDBKVMessages.es,
    home: 'Inicio',
    notFoundTitle: 'Página no encontrada',
    notFoundDescription: 'Esta página no existe o se ha movido.',
    notFoundHome: 'Volver al inicio',
    admin: 'Administración',
    users: 'Usuarios',
    settings: 'Configuración',
    changePassword: 'Cambiar contraseña',
    apiDocs: 'Documentación de la API',
    exit: 'Cerrar sesión',
    language: 'Idioma',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    brandHome: 'Inicio de LZApp',
    navigationTitle: 'Navegación',
    navigationDescription: 'Navegación principal',
    dashboardDescription: 'Panel de LZApp',
    notifications: 'Notificaciones',
    switchToLight: 'Cambiar al modo claro',
    switchToDark: 'Cambiar al modo oscuro'
  },
  hi: {
    ...authMessages.hi,
    ...adminUsersMessages.hi,
    ...adminDBKVMessages.hi,
    home: 'होम',
    notFoundTitle: 'पेज नहीं मिला',
    notFoundDescription: 'यह पेज मौजूद नहीं है या इसे कहीं और ले जाया गया है।',
    notFoundHome: 'होम पर वापस जाएँ',
    admin: 'प्रशासन',
    users: 'उपयोगकर्ता',
    settings: 'सेटिंग्स',
    changePassword: 'पासवर्ड बदलें',
    apiDocs: 'API दस्तावेज़',
    exit: 'लॉग आउट',
    language: 'भाषा',
    lightMode: 'लाइट मोड',
    darkMode: 'डार्क मोड',
    brandHome: 'LZApp होम',
    navigationTitle: 'नेविगेशन',
    navigationDescription: 'मुख्य नेविगेशन',
    dashboardDescription: 'LZApp डैशबोर्ड',
    notifications: 'सूचनाएँ',
    switchToLight: 'लाइट मोड चालू करें',
    switchToDark: 'डार्क मोड चालू करें'
  },
  fr: {
    ...authMessages.fr,
    ...adminUsersMessages.fr,
    ...adminDBKVMessages.fr,
    home: 'Accueil',
    notFoundTitle: 'Page introuvable',
    notFoundDescription: 'Cette page n’existe pas ou a été déplacée.',
    notFoundHome: 'Retour à l’accueil',
    admin: 'Administration',
    users: 'Utilisateurs',
    settings: 'Paramètres',
    changePassword: 'Changer le mot de passe',
    apiDocs: 'Documentation API',
    exit: 'Se déconnecter',
    language: 'Langue',
    lightMode: 'Mode clair',
    darkMode: 'Mode sombre',
    brandHome: 'Accueil LZApp',
    navigationTitle: 'Navigation',
    navigationDescription: 'Navigation principale',
    dashboardDescription: 'Tableau de bord LZApp',
    notifications: 'Notifications',
    switchToLight: 'Passer au mode clair',
    switchToDark: 'Passer au mode sombre'
  },
  ar: {
    ...authMessages.ar,
    ...adminUsersMessages.ar,
    ...adminDBKVMessages.ar,
    home: 'الرئيسية',
    notFoundTitle: 'الصفحة غير موجودة',
    notFoundDescription: 'هذه الصفحة غير موجودة أو تم نقلها.',
    notFoundHome: 'العودة إلى الرئيسية',
    admin: 'الإدارة',
    users: 'المستخدمون',
    settings: 'الإعدادات',
    changePassword: 'تغيير كلمة المرور',
    apiDocs: 'توثيق API',
    exit: 'تسجيل الخروج',
    language: 'اللغة',
    lightMode: 'الوضع الفاتح',
    darkMode: 'الوضع الداكن',
    brandHome: 'الرئيسية في LZApp',
    navigationTitle: 'التنقل',
    navigationDescription: 'التنقل الرئيسي',
    dashboardDescription: 'لوحة تحكم LZApp',
    notifications: 'الإشعارات',
    switchToLight: 'التبديل إلى الوضع الفاتح',
    switchToDark: 'التبديل إلى الوضع الداكن'
  }
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return languageConfig.languages.some(language => language.code === value)
}