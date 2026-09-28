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
  home: 'Home',
  admin: 'Admin',
  users: 'Users',
  settings: 'Settings',
  changePassword: 'Change password',
  exit: 'Exit',
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
    home: '首页',
    admin: '管理',
    users: '用户',
    settings: '设置',
    changePassword: '修改密码',
    exit: '退出',
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
    home: 'Inicio',
    admin: 'Administración',
    users: 'Usuarios',
    settings: 'Configuración',
    changePassword: 'Cambiar contraseña',
    exit: 'Salir',
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
    home: 'होम',
    admin: 'प्रशासन',
    users: 'उपयोगकर्ता',
    settings: 'सेटिंग्स',
    changePassword: 'पासवर्ड बदलें',
    exit: 'बाहर निकलें',
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
    home: 'Accueil',
    admin: 'Administration',
    users: 'Utilisateurs',
    settings: 'Paramètres',
    changePassword: 'Changer le mot de passe',
    exit: 'Quitter',
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
    home: 'الرئيسية',
    admin: 'الإدارة',
    users: 'المستخدمون',
    settings: 'الإعدادات',
    changePassword: 'تغيير كلمة المرور',
    exit: 'خروج',
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