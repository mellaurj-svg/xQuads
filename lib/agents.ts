export interface Agent {
  id: string;
  name: string;
  icon: string;
  title: string;
  whenToUse: string;
}

export const AGENTS: Agent[] = [
  { id: "hormozi-ads",       name: "Hormozi Ads",       icon: "📢", title: "Paid Advertising — Hormozi Framework",     whenToUse: "When paid ads aren't profitable. When CPA is too high. When creative is fatiguing. When scaling ad spend." },
  { id: "hormozi-advisor",   name: "Hormozi Advisor",   icon: "🦁", title: "Strategic Business Advisor",               whenToUse: "When needing strategic business advice. When stuck at a plateau. When making business model decisions." },
  { id: "hormozi-audit",     name: "Hormozi Audit",     icon: "🔍", title: "Business Evaluation & Diagnostician",      whenToUse: "When evaluating a business. When doing a health check. When identifying what's broken." },
  { id: "hormozi-chief",     name: "Hormozi Chief",     icon: "🐝", title: "Squad Orchestrator",                       whenToUse: "General questions. Not sure which agent to use. Diagnose and route business problems." },
  { id: "hormozi-closer",    name: "Hormozi Closer",    icon: "🤝", title: "CLOSER Framework & Sales",                 whenToUse: "When leads don't convert. When closing rate is low. When objection handling is weak." },
  { id: "hormozi-content",   name: "Hormozi Content",   icon: "📱", title: "Content Machine & Organic Strategy",       whenToUse: "When organic leads are weak. When content isn't converting. When building a content system." },
  { id: "hormozi-copy",      name: "Hormozi Copy",      icon: "✍️", title: "Copywriting Specialist",                   whenToUse: "When writing sales pages, landing pages, or ad copy. When copy needs to be value-driven." },
  { id: "hormozi-hooks",     name: "Hormozi Hooks",     icon: "🪝", title: "Hook Creation & Attention Capture",        whenToUse: "When content isn't getting engagement. When emails aren't being opened. When needing headlines." },
  { id: "hormozi-launch",    name: "Hormozi Launch",    icon: "🚀", title: "Launch Strategy & Market Entry",           whenToUse: "When launching a new product. When starting from zero. When doing a pre-sale." },
  { id: "hormozi-leads",     name: "Hormozi Leads",     icon: "🧲", title: "$100M Leads — Core 4 Lead Gen",            whenToUse: "When not enough leads. When pipeline is inconsistent. When scaling acquisition." },
  { id: "hormozi-models",    name: "Hormozi Models",    icon: "🏗️", title: "Business Model Design",                   whenToUse: "When the business model is wrong. When margins are too thin. When the model can't scale." },
  { id: "hormozi-offers",    name: "Hormozi Offers",    icon: "🎰", title: "Grand Slam Offer Architect",               whenToUse: "When creating or improving offers. When conversion is low. When people say 'too expensive'." },
  { id: "hormozi-pricing",   name: "Hormozi Pricing",   icon: "💎", title: "Value-Based Pricing Strategist",           whenToUse: "When competing on price. When margins are thin. When pricing a new offer." },
  { id: "hormozi-retention", name: "Hormozi Retention", icon: "🔄", title: "Churn Reduction & LTV Maximization",       whenToUse: "When churn is high. When LTV is low. When customers leave early." },
  { id: "hormozi-scale",     name: "Hormozi Scale",     icon: "📈", title: "Business Scaling & Systems",               whenToUse: "When stuck at a revenue plateau. When owner is the bottleneck. When operations are breaking." },
  { id: "hormozi-workshop",  name: "Hormozi Workshop",  icon: "🎓", title: "Workshop & Event Design",                  whenToUse: "When designing workshops or events. When creating group training. When building premium experiences." },
];

export const ROUTING_GUIDE = AGENTS.map(a =>
  `- ${a.id} (${a.name} ${a.icon}): ${a.whenToUse}`
).join('\n');
