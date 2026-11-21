// Modelo SaaS: roles, permisos y planes

export const ROLES = {
  superadmin: { label: 'Súper administrador', short: 'Beez · Admin', desc: 'Equipo Beez: ve todas las plantas, planes y accesos' },
  integrator: { label: 'Integrador', short: 'Integrador', desc: 'Configura medidores y comunicación en las plantas asignadas' },
  plant_admin: { label: 'Administrador de planta', short: 'Admin. planta', desc: 'Gestiona su planta, usuarios y configuración' },
  supervisor: { label: 'Supervisor', short: 'Supervisor', desc: 'Analiza consumos, dashboards, reportes y alertas' },
  operator: { label: 'Operador', short: 'Operador', desc: 'Visualiza indicadores y reconoce alertas' },
}

const PERMS = {
  superadmin: ['*'],
  integrator: ['plants.switch', 'dash.edit', 'config.meters', 'config.integrations', 'config.diagram', 'alerts.rules', 'reports', 'config.settings'],
  plant_admin: ['dash.edit', 'config.meters', 'config.integrations', 'config.diagram', 'alerts.rules', 'reports', 'config.settings', 'users.manage'],
  supervisor: ['dash.edit', 'reports', 'alerts.rules'],
  operator: [],
}
export const can = (user, perm) => !!user && (PERMS[user.role]?.includes('*') || PERMS[user.role]?.includes(perm))

// Ruta → permiso requerido (las demás son de visualización para todos)
export const ROUTE_PERM = {
  '/consola': 'console',
  '/plantas': 'plants.switch',
  '/integraciones': 'config.integrations',
  '/configuracion': 'config.settings',
  '/reportes': 'reports',
}

export const PLANS = {
  starter: {
    name: 'Starter', monthly: 79, price: 'US$ 79', per: '/ mes por planta', meters: 5, dashboards: 3, users: 3, history: '12 meses',
    tagline: 'Para plantas pequeñas que empiezan a medir',
    features: { balance: true, alerts: true, voltage: false, unifilar: false, mqtt: false, api: false, sso: false },
  },
  pro: {
    name: 'Pro', monthly: 189, price: 'US$ 189', per: '/ mes por planta', meters: 12, dashboards: Infinity, users: 10, history: '36 meses',
    tagline: 'Gestión energética completa por áreas',
    features: { balance: true, alerts: true, voltage: true, unifilar: true, mqtt: true, api: false, sso: false },
  },
  enterprise: {
    name: 'Enterprise', monthly: 690, price: 'A medida', per: 'contrato anual', meters: Infinity, dashboards: Infinity, users: Infinity, history: 'Ilimitado',
    tagline: 'Multi-sede, integraciones y soporte dedicado',
    features: { balance: true, alerts: true, voltage: true, unifilar: true, mqtt: true, api: true, sso: true },
  },
}
export const FEATURE_LABELS = {
  balance: 'Balance mensual y reportes',
  alerts: 'Alertas y anotaciones',
  voltage: 'Calidad de energía (huecos / sobretensiones)',
  unifilar: 'Diagrama unifilar en vivo',
  mqtt: 'Integración MQTT / OPC UA',
  api: 'API y exportación automática',
  sso: 'SSO y soporte dedicado 24/7',
}
export const planOf = (plant) => PLANS[plant?.plan] || PLANS.starter
export const hasFeature = (plant, f) => !!planOf(plant).features[f]
export const fmtLimit = (n) => (n === Infinity ? 'Ilimitado' : n)
export const minPlanFor = (f) => Object.entries(PLANS).find(([, p]) => p.features[f])?.[1]?.name || 'Enterprise'
