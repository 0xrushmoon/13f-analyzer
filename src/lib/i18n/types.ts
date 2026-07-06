export const locales = ["en", "zh-CN"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-CN";

export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

export type PageMeta = {
  title: string;
  description: string;
};

export type Dictionary = {
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  pageMeta: {
    institutions: PageMeta;
    holdings: PageMeta;
    analyze: PageMeta;
    pricing: PageMeta;
    docs: PageMeta;
  };
  nav: {
    institutions: string;
    holdings: string;
    analyze: string;
    pricing: string;
    docs: string;
    login: string;
    getStarted: string;
    deposit: string;
    tagline: string;
    menuOpen: string;
    menuClose: string;
  };
  footer: {
    disclaimer: string;
    lagNotice: string;
  };
  theme: {
    dark: string;
    light: string;
    language: string;
  };
  paywall: {
    title: string;
    description: string;
    verifyEmail: string;
    upgrade: string;
  };
  home: {
    badge: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    featuresTitle: string;
    features: Array<{ title: string; description: string }>;
    pricingTitle: string;
    pricingSubtitle: string;
    viewPricing: string;
  };
  common: {
    language: string;
  };
  charts: {
    noData: string;
    noChanges: string;
    needMultipleQuarters: string;
    pieView: string;
    barView: string;
    topHoldings: string;
    quarterTrend: string;
    quarterTrendDesc: string;
    others: string;
    valueDelta: string;
    changeTypes: {
      new: string;
      increased: string;
      decreased: string;
      closed: string;
      unchanged: string;
    };
  };
  holdingsCompare: {
    title: string;
    subtitle: string;
    cikLabel: string;
    fromPeriod: string;
    toPeriod: string;
    loading: string;
    emptyState: string;
    changesTitle: string;
    security: string;
    changeType: string;
    sharesDelta: string;
    valueDelta: string;
    changesChart: string;
    quarterTrend: string;
  };
  institutions: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    loading: string;
    emptyState: string;
    noHoldingsData: string;
    colName: string;
    totalValue: string;
    holdingsCount: string;
    asOf: string;
    backfillHint: string;
    adminLink: string;
  };
  institutionDetail: {
    totalValue: string;
    holdingsCount: string;
    reportPeriod: string;
    filedAt: string;
    filedAtUnknown: string;
    allHoldings: string;
    filingHistory: string;
    aiAnalyze: string;
    dbNotConnected: string;
    viewFiling: string;
  };
  holdingDetail: {
    title: string;
    backToInstitution: string;
    issuer: string;
    ticker: string;
    cusip: string;
    shares: string;
    value: string;
    portfolioPct: string;
    putCall: string;
    putCallNone: string;
    period: string;
    notFound: string;
    marketData: string;
    symbol: string;
    impliedPriceAtFiling: string;
    priceAtFiling: string;
    currentPrice: string;
    gainSinceFiling: string;
    priceUnavailable: string;
    chineseName: string;
    tradeOnHyperliquid: string;
    hyperliquidUnavailable: string;
  };
  filingDetail: {
    title: string;
    backToInstitution: string;
    accessionNumber: string;
    periodEnd: string;
    filedAt: string;
    status: string;
    holdingsCount: string;
    topHoldings: string;
    viewOnSec: string;
    notFound: string;
    filedAtUnknown: string;
  };
  holdingsTable: {
    security: string;
    cusip: string;
    shares: string;
    value: string;
    noData: string;
    viewDetails: string;
  };
  analyze: {
    title: string;
    subtitle: string;
    cikLabel: string;
    cikPlaceholder: string;
    chatTitle: string;
    emptyState: string;
    thinking: string;
    loading: string;
    inputPlaceholder: string;
    analysisFailed: string;
    requestFailed: string;
    pageLoading: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    freePeriod: string;
    perMonth: string;
    usageBased: string;
    freeCta: string;
    proCta: string;
    apiCta: string;
    compareTitle: string;
    recommended: string;
    mppTitle: string;
    mppDesc: string;
    colFeature: string;
    colFree: string;
    colPro: string;
    colApi: string;
  };
  docs: {
    title: string;
    subtitle: string;
    authTitle: string;
    authDesc: string;
    endpointsTitle: string;
    mppTitle: string;
    mppDesc: string;
    openApiLink: string;
    exampleTitle: string;
    baseUrlTitle: string;
    agentsTitle: string;
    agentsDesc: string;
    rateLimitsTitle: string;
    colMethod: string;
    colEndpoint: string;
    colDescription: string;
    navAuth: string;
    navEndpoints: string;
    navMpp: string;
    navAgents: string;
    navExample: string;
  };
  login: {
    title: string;
    subtitle: string;
    signIn: string;
    signUp: string;
    email: string;
    password: string;
    name: string;
    signInFailed: string;
    signUpSuccess: string;
    signUpFailed: string;
    verifyEmailSent: string;
    emailNotVerified: string;
    networkError: string;
  };
  account: {
    title: string;
    subscriptionTab: string;
    apiKeysTab: string;
    usageTab: string;
    currentPlan: string;
    subscriptionDesc: string;
    currentPlanLabel: string;
    freePlan: string;
    proPlan: string;
    upgradeToPro: string;
    apiKeysTitle: string;
    apiKeysDesc: string;
    keyName: string;
    keyNamePlaceholder: string;
    generateKey: string;
    saveKeyWarning: string;
    usageTitle: string;
    usageDesc: string;
    apiCalls: string;
    aiAnalyses: string;
  };
  admin: {
    title: string;
    subtitle: string;
    authTitle: string;
    authDesc: string;
    adminSecretPlaceholder: string;
    refreshStatus: string;
    triggerBackfill: string;
    repairValues: string;
    repairDone: string;
    repairFailed: string;
    enterAdminSecret: string;
    invalidAdminSecret: string;
    loadStatusFailed: string;
    networkError: string;
    backfillQueued: string;
    backfillFailed: string;
    configured: string;
    notConfigured: string;
    d1Stats: string;
    counts: {
      institutions: string;
      filings: string;
      holdings: string;
      holdingChanges: string;
      users: string;
    };
    secretsTitle: string;
    secretsDesc: string;
    configureDeepSeek: string;
    configureDeepSeekDesc: string;
    runInTerminal: string;
    secUserAgentNote: string;
    pipelineTitle: string;
    institutionsSeeded: string;
    backfillComplete: string;
    ingestionWorker: string;
  };
};
