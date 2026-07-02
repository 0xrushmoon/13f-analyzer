import type { Dictionary } from "../types";

const zhCN: Dictionary = {
  meta: {
    title: "13F 智能分析平台",
    description: "追踪美国顶级机构 13F 持仓，AI 深度解读投资动向",
  },
  nav: {
    institutions: "机构浏览",
    holdings: "持仓对比",
    analyze: "AI 分析",
    pricing: "定价",
    docs: "API 文档",
    login: "登录",
    getStarted: "开始使用",
    tagline: "智能分析平台",
  },
  footer: {
    disclaimer:
      "13F 智能分析平台 · 数据来源 SEC EDGAR · 仅供参考，不构成投资建议",
    lagNotice:
      "数据截至各机构最新 13F-HR 申报日期，通常滞后于季度末 45 天内",
  },
  home: {
    badge: "开源 · Cloudflare 边缘部署",
    title: "追踪",
    titleHighlight: "聪明钱",
    subtitle:
      "自动抓取 SEC 13F-HR 申报，对比季度持仓变化，基于 DeepSeek 提供连贯的 AI 深度解读。",
    ctaPrimary: "浏览机构",
    ctaSecondary: "查看定价",
    featuresTitle: "为研究者与开发者打造",
    features: [
      {
        title: "精选机构追踪",
        description:
          "覆盖伯克希尔、桥水、文艺复兴等 100+ 顶级机构，自动同步 SEC 13F-HR 申报",
      },
      {
        title: "季度对比分析",
        description: "可视化展示加仓、减仓、新建仓与清仓，快速把握投资动向变化",
      },
      {
        title: "AI 深度解读",
        description:
          "基于 DeepSeek 大模型，提供连贯的多轮对话分析，支持跨季度逻辑推理",
      },
      {
        title: "Agent API",
        description: "RESTful API 接入，按量计费，支持程序化查询持仓与 AI 分析",
      },
    ],
    pricingTitle: "简单透明的定价",
    pricingSubtitle: "免费起步，按需升级 Pro 或 API",
    viewPricing: "查看全部方案",
  },
  common: {
    language: "语言",
  },
};

export default zhCN;
