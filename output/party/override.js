/**
 * override.js — mihomo-party 覆写脚本（自动生成，勿手动编辑）
 * 数据源：source.yaml
 *
 * 换主/辅订阅：改下方 SUBS.main（仅本覆写立刻生效），
 * 或改 source.yaml subscriptions 后重新 generate（Party / Stash / subconverter 一起变）。
 */

// ── 订阅角色：改 main 即可切换主订阅 ─────────────────────────
const SUBS = {
    "main": "花云",
    "sources": {
        "花云": {
            "prefix": "[🌸]",
            "kind": "airport"
        },
        "Hneko": {
            "prefix": "[H]",
            "kind": "airport",
            "roles": [
                "media",
                "bulk"
            ],
            "exclude": "(?i)🇯🇵|日本|东京|東京|Japan|Tokyo"
        },
        "Oracle": {
            "prefix": "(?i)^oracle",
            "kind": "vps"
        }
    }
};

const EXCLUDE_PATTERN = "(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)";

/**
 * 主/辅/VPS 前缀布局。
 * generate.js 在 Node 里 require；也会整段嵌入 Party override.js。
 *
 * 约定：
 *   prefix 以 ^ 或 (?i)^ 开头 → 锚定正则（如 (?i)^oracle）
 *   其余 → 字面量子串（如 [🌸]、[H]，自动转义）
 */

const AUX_WRAPPER_NAME = '🎬 辅订阅';
const AUX_GROUP_PREFIX = '🎬 ';
const BUILTIN_PROXY_NAMES = ['DIRECT', 'REJECT'];

function escapeRegexLiteral(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function prefixIsAnchored(prefix) {
    return /^(?:\(\?i\))?\^/.test(String(prefix || ''));
}

function prefixBody(prefix) {
    return String(prefix || '').replace(/^\(\?i\)/, '').replace(/^\^/, '');
}

function positiveLookahead(prefix) {
    if (prefixIsAnchored(prefix)) {
        return `(?=${prefixBody(prefix)})`;
    }
    return `(?=.*${escapeRegexLiteral(prefix)})`;
}

function negativeLookahead(prefix) {
    if (prefixIsAnchored(prefix)) {
        return `(?!${prefixBody(prefix)})`;
    }
    return `(?!.*${escapeRegexLiteral(prefix)})`;
}

function normalizeExistingFilter(existingFilter) {
    if (!existingFilter) {
        return '';
    }
    let f = String(existingFilter).replace(/^\(\?i\)/, '');
    if (f.startsWith('^')) {
        f = f.slice(1);
    }
    if (f.endsWith('.*')) {
        f = f.slice(0, -2);
    }
    if (f.startsWith('(?=') || f.startsWith('(?!')) {
        return f;
    }
    return `(?=.*(?:${f}))`;
}

function normalizeExtraExclude(extraExclude) {
    if (!extraExclude) {
        return '';
    }
    let f = String(extraExclude).replace(/^\(\?i\)/, '');
    if (f.startsWith('^')) {
        f = f.slice(1);
    }
    if (f.startsWith('(?!')) {
        return f.replace(/\.\*$/, '');
    }
    return `(?!.*(?:${f}))`;
}

/**
 * 拼一条 mihomo/Stash/subconverter 都能用的节点名 filter。
 * @param {{
 *   positives?: string[],
 *   excludes?: string[],
 *   extraExclude?: string,
 *   existingFilter?: string,
 *   excludePattern?: string,
 * }} opts
 */
function composeFilter(opts) {
    const positives = (opts && opts.positives) || [];
    const excludes = (opts && opts.excludes) || [];
    const extraExclude = opts && opts.extraExclude;
    const existingFilter = opts && opts.existingFilter;
    const excludePattern = opts && opts.excludePattern;

    const parts = ['(?i)^'];
    const ancNeg = excludes.filter(prefixIsAnchored);
    const litNeg = excludes.filter((p) => !prefixIsAnchored(p));
    const ancPos = positives.filter(prefixIsAnchored);
    const litPos = positives.filter((p) => !prefixIsAnchored(p));

    for (const p of ancNeg) {
        parts.push(negativeLookahead(p));
    }
    if (ancPos.length === 1) {
        parts.push(positiveLookahead(ancPos[0]));
    } else if (ancPos.length > 1) {
        parts.push(`(?=${ancPos.map((p) => `(?:${prefixBody(p)})`).join('|')})`);
    }
    for (const p of litNeg) {
        parts.push(negativeLookahead(p));
    }
    if (litPos.length === 1) {
        parts.push(positiveLookahead(litPos[0]));
    } else if (litPos.length > 1) {
        parts.push(`(?=.*(?:${litPos.map(escapeRegexLiteral).join('|')}))`);
    }
    if (excludePattern) {
        parts.push(`(?!.*(?:${excludePattern}))`);
    }
    const extra = normalizeExtraExclude(extraExclude);
    if (extra) {
        parts.push(extra);
    }
    const existing = normalizeExistingFilter(existingFilter);
    if (existing) {
        parts.push(existing);
    }
    parts.push('.*');
    return parts.join('');
}

function listSourceEntries(subscriptions) {
    const sources = (subscriptions && subscriptions.sources) || {};
    return Object.keys(sources).map((name) => {
        const spec = sources[name] || {};
        return { name, ...spec };
    });
}

function resolveSubscriptions(subscriptions) {
    const all = listSourceEntries(subscriptions);
    const mainName = subscriptions && subscriptions.main;
    const main = all.find((s) => s.name === mainName) || null;
    const aux = all.filter((s) => s.kind === 'airport' && s.name !== mainName);
    const vps = all.filter((s) => s.kind === 'vps');
    return {
        main,
        aux,
        vps,
        all,
        wrapperName: AUX_WRAPPER_NAME,
    };
}

function prefixesFor(from, ctx) {
    if (from === 'main') {
        return ctx.main && ctx.main.prefix ? [ctx.main.prefix] : [];
    }
    if (from === 'vps') {
        return ctx.vps.map((s) => s.prefix).filter(Boolean);
    }
    if (from === 'subs') {
        return ctx.aux.map((s) => s.prefix).filter(Boolean);
    }
    return [];
}

function otherPrefixes(from, ctx) {
    const used = new Set(prefixesFor(from, ctx));
    return ctx.all.map((s) => s.prefix).filter((p) => p && !used.has(p));
}

function cloneGroup(pg) {
    const g = { ...pg };
    if (Array.isArray(pg.proxies)) {
        g.proxies = pg.proxies.slice();
    }
    return g;
}

function dropMissingGroupRefs(groups) {
    const names = new Set(BUILTIN_PROXY_NAMES);
    for (const g of groups) {
        if (g && g.name) {
            names.add(g.name);
        }
    }
    for (const g of groups) {
        if (!Array.isArray(g.proxies)) {
            continue;
        }
        g.proxies = g.proxies.filter((p) => names.has(p));
    }
    return groups;
}

function buildAuxGroups(ctx, options) {
    const includeAll = options.includeAll;
    const excludePattern = options.excludePattern;
    const groups = [];
    const wrapperProxies = [];

    for (const source of ctx.aux) {
        const name = `${AUX_GROUP_PREFIX}${source.name}`;
        wrapperProxies.push(name);
        const others = ctx.all
            .filter((s) => s.name !== source.name)
            .map((s) => s.prefix)
            .filter(Boolean);
        const g = {
            name,
            type: 'url-test',
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            tolerance: 50,
            'max-failed-times': 3,
            filter: composeFilter({
                positives: source.prefix ? [source.prefix] : [],
                excludes: others,
                extraExclude: source.exclude,
                excludePattern,
            }),
        };
        if (includeAll) {
            g['include-all'] = true;
        }
        groups.push(g);
    }

    if (wrapperProxies.length === 0) {
        return [];
    }
    return [
        {
            name: ctx.wrapperName,
            type: 'select',
            proxies: wrapperProxies,
        },
        ...groups,
    ];
}

function applyFromFilters(groups, ctx, options) {
    const includeAll = options.includeAll;
    const excludePattern = options.excludePattern;

    for (const g of groups) {
        const from = g.from;
        if (!from) {
            delete g.from;
            if (!includeAll) {
                delete g['include-all'];
            }
            continue;
        }
        g.filter = composeFilter({
            positives: prefixesFor(from, ctx),
            excludes: otherPrefixes(from, ctx),
            existingFilter: g.filter,
            excludePattern,
        });
        if (includeAll) {
            g['include-all'] = true;
        } else {
            delete g['include-all'];
        }
        delete g.from;
    }
    return groups;
}

/**
 * 把 source.yaml 的策略组模板展开成客户端可用的组：
 *   - from: main/vps 注入前缀 filter
 *   - 插入 🎬 辅订阅 及每个辅源测速组
 *   - 没有辅源时删掉对 🎬 辅订阅 的引用
 *
 * @param {Array<Record<string, any>>} groups
 * @param {{
 *   subscriptions: Record<string, any>,
 *   excludePattern: string,
 *   includeAll?: boolean,
 * }} options
 */
function layoutProxyGroups(groups, options) {
    const includeAll = !options || options.includeAll !== false;
    const opts = {
        includeAll,
        excludePattern: (options && options.excludePattern) || '',
    };
    const ctx = resolveSubscriptions(options && options.subscriptions);
    const laid = groups.map(cloneGroup);

    applyFromFilters(laid, ctx, opts);

    const auxGroups = buildAuxGroups(ctx, opts);
    if (auxGroups.length > 0) {
        const idx = laid.findIndex((g) => g.name === '🐔 小鸡节点');
        if (idx >= 0) {
            laid.splice(idx, 0, ...auxGroups);
        } else {
            laid.push(...auxGroups);
        }
    }

    dropMissingGroupRefs(laid);
    return laid;
}

const GROUP_TEMPLATES = [
    {
        "name": "👋 手动切换",
        "type": "select",
        "proxies": [
            "⚡ 自动选择",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇸🇬 狮城节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🇪🇺 欧洲节点",
            "🇹🇷 土耳其节点",
            "🎬 辅订阅",
            "🐔 小鸡节点",
            "🏷️ 低倍率",
            "🧊 冷门节点",
            "DIRECT"
        ]
    },
    {
        "name": "🚀 国外网站",
        "type": "select",
        "proxies": [
            "⚡ 自动选择",
            "👋 手动切换"
        ]
    },
    {
        "name": "Telegram",
        "type": "select",
        "proxies": [
            "🎬 辅订阅",
            "⚡ 自动选择",
            "🏷️ 低倍率",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇸🇬 狮城节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换"
        ],
        "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Telegram.png"
    },
    {
        "name": "🤖 AI",
        "type": "select",
        "proxies": [
            "🇸🇬 狮城节点",
            "🐔 小鸡节点",
            "🏷️ 低倍率",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换"
        ]
    },
    {
        "name": "🎮 游戏服务",
        "type": "select",
        "proxies": [
            "🇸🇬 狮城节点",
            "🐔 小鸡节点",
            "🏷️ 低倍率",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换",
            "DIRECT"
        ]
    },
    {
        "name": "Emby",
        "type": "select",
        "proxies": [
            "🎬 辅订阅",
            "DIRECT",
            "🏷️ 低倍率",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇸🇬 狮城节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换"
        ],
        "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Emby.png"
    },
    {
        "name": "Spotify",
        "type": "select",
        "proxies": [
            "🇹🇷 土耳其节点",
            "🏷️ 低倍率",
            "🇺🇲 美国节点",
            "🇭🇰 香港节点",
            "🇸🇬 狮城节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换",
            "DIRECT"
        ],
        "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Spotify.png"
    },
    {
        "name": "📚 E站",
        "type": "select",
        "proxies": [
            "🇪🇺 欧洲节点",
            "🇺🇲 美国节点",
            "👋 手动切换"
        ]
    },
    {
        "name": "🥵 不许涩涩",
        "type": "select",
        "proxies": [
            "🇸🇬 狮城节点",
            "🏷️ 低倍率",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换",
            "DIRECT"
        ]
    },
    {
        "name": "🐟 漏网之鱼",
        "type": "select",
        "proxies": [
            "🇸🇬 狮城节点",
            "🏷️ 低倍率",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换",
            "DIRECT"
        ]
    },
    {
        "name": "📦 大宗流量",
        "type": "select",
        "proxies": [
            "🎬 辅订阅",
            "DIRECT",
            "🏷️ 低倍率",
            "🇸🇬 狮城节点",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换"
        ]
    },
    {
        "name": "💻 环境仓库",
        "type": "select",
        "proxies": [
            "🏷️ 低倍率",
            "🐔 小鸡节点",
            "🇸🇬 狮城节点",
            "🇭🇰 香港节点",
            "🇺🇲 美国节点",
            "🇯🇵 日本节点",
            "🇹🇼 台湾节点",
            "🧊 冷门节点",
            "👋 手动切换",
            "DIRECT"
        ]
    },
    {
        "name": "⚡ 自动选择",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)^(?=.*(🇭🇰|香港|HK|Hong\\s*Kong|🇺🇲|🇺🇸|美国|US|United.?States|洛杉矶|圣何塞|🇸🇬|新加坡|狮城|SG|Singapore|🇯🇵|日本|东京|JP|Japan|🇹🇼|台湾|TW|Tai|Taiwan))(?!.*(实验|低倍率)).*",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🏷️ 低倍率",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)(实验|低倍率|低倍|0\\.[1-9]\\s*(?:x|倍)?|[1-5]折)",
        "include-all": true,
        "url": "https://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🐔 小鸡节点",
        "type": "select",
        "from": "vps",
        "include-all": true
    },
    {
        "name": "🇭🇰 香港节点",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)🇭🇰|香港|HK|Hong\\s*Kong",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🇺🇲 美国节点",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)🇺🇲|🇺🇸|美国|US|United.?States|洛杉矶|圣何塞",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🇸🇬 狮城节点",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)🇸🇬|新加坡|狮城|SG|Singapore",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🇪🇺 欧洲节点",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)🇪🇺|欧洲|Europe|🇩🇪|德国|Germany|Frankfurt|法兰克福|Berlin|柏林|🇳🇱|荷兰|Netherlands|Amsterdam|阿姆斯特丹|🇬🇧|英国|United.?Kingdom|London|伦敦|🇫🇷|法国|France|Paris|巴黎|🇮🇪|爱尔兰|Ireland|Dublin|都柏林",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🇹🇷 土耳其节点",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)🇹🇷|土耳其|TR|Turkey|Turkiye|Türkiye|Istanbul",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🇯🇵 日本节点",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)🇯🇵|日本|东京|JP|Japan",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🇹🇼 台湾节点",
        "type": "url-test",
        "from": "main",
        "filter": "(?i)🇹🇼|台湾|TW|Taiwan|Tai",
        "include-all": true,
        "url": "http://www.gstatic.com/generate_204",
        "interval": 300,
        "tolerance": 5
    },
    {
        "name": "🧊 冷门节点",
        "type": "select",
        "from": "main",
        "filter": "^(?!.*(🇭🇰|香港|HK|Hong|🇺🇸|🇺🇲|美国|洛杉矶|圣何塞|US|United.?States|🇸🇬|新加坡|狮|SG|Singapore|🇯🇵|日本|东京|JP|Japan|🇹🇼|台湾|TW|Tai|Taiwan)).*",
        "include-all": true
    },
    {
        "name": "🛑 广告隐私",
        "type": "select",
        "proxies": [
            "REJECT",
            "DIRECT"
        ]
    },
    {
        "name": "🎯 全球直连",
        "type": "select",
        "proxies": [
            "DIRECT"
        ]
    }
];

/**
 * 补全测速字段，去掉 select 不需要的项。
 * @param {Record<string, any>} group
 * @returns {Record<string, any>}
 */
function finalizePartyGroup(group) {
    const out = Object.assign({}, group);
    if (Array.isArray(group.proxies)) {
        out.proxies = group.proxies.slice();
    }
    if (group.type === 'url-test') {
        if (out.interval == null) out.interval = 300;
        if (!out.url) out.url = 'http://www.gstatic.com/generate_204';
        if (out['max-failed-times'] == null) out['max-failed-times'] = 3;
    }
    if (group.type === 'select') {
        delete out.url;
        delete out.interval;
        delete out.tolerance;
        delete out['max-failed-times'];
        if (!out.filter) delete out['include-all'];
    }
    delete out.from;
    return out;
}

/**
 * @param {Record<string, any>} config 原始 Clash 配置对象
 * @returns {Record<string, any>} 修改后的 Clash 配置对象
 */
function main(config) {
    const proxyCount = config?.proxies?.length ?? 0;
    const providerCount =
        typeof config?.['proxy-providers'] === 'object'
            ? Object.keys(config['proxy-providers']).length
            : 0;
    if (proxyCount === 0 && providerCount === 0) {
        throw new Error('配置文件中未找到任何代理');
    }

    // 过滤代理节点名称（与 subconverter exclude_remarks 保持一致）
    const _excReg = new RegExp(EXCLUDE_PATTERN, 'i');
    if (Array.isArray(config.proxies)) {
        config.proxies = config.proxies.filter(p => !_excReg.test(p.name));
    }

    // 覆盖通用参数
    config["mixed-port"] = 7890;
    config["tcp-concurrent"] = true;
    config["allow-lan"] = true;
    config["ipv6"] = false;
    config["log-level"] = "info";
    config["unified-delay"] = true;
    config["find-process-mode"] = "strict";
    config["global-client-fingerprint"] = "chrome";

    // 覆盖 DNS
    config['dns'] = {
        "enable": true,
        "ipv6": true,
        "use-hosts": true,
        "prefer-h3": true,
        "listen": "0.0.0.0:53",
        "enhanced-mode": "fake-ip",
        "fake-ip-range": "198.18.0.1/16",
        "fake-ip-filter": [
            "*",
            "+.lan",
            "+.local",
            "time.*.com",
            "ntp.*.com",
            "+.market.xiaomi.com"
        ],
        "default-nameserver": [
            "https://223.5.5.5/dns-query"
        ],
        "nameserver": [
            "https://dns.alidns.com/dns-query"
        ],
        "proxy-server-nameserver": [
            "https://dns.alidns.com/dns-query",
            "https://doh.pub/dns-query"
        ],
        "fallback": [
            "https://dns.cloudflare.com/dns-query"
        ],
        "fallback-filter": {
            "geoip": true,
            "geoip-code": "CN",
            "geosite": [
                "gfw"
            ],
            "ipcidr": [
                "240.0.0.0/4"
            ]
        },
        "nameserver-policy": {
            "+.googleapis.cn": "https://posvdm.cloudflare-gateway.com/dns-query",
            "+.googleapis.com": "https://posvdm.cloudflare-gateway.com/dns-query",
            "+.gvt1.com": "https://posvdm.cloudflare-gateway.com/dns-query",
            "+.gvt2.com": "https://posvdm.cloudflare-gateway.com/dns-query",
            "+.xn--ngstr-lra8j.com": "https://posvdm.cloudflare-gateway.com/dns-query",
            "geosite:google": "https://posvdm.cloudflare-gateway.com/dns-query",
            "geosite:cn,private,apple": "https://dns.alidns.com/dns-query",
            "geosite:!cn,gfw": "https://posvdm.cloudflare-gateway.com/dns-query",
            "emby.sounfury.me": "https://dns.cloudflare.com/dns-query"
        }
    };

    // 覆盖 sniffer
    config['sniffer'] = {
        "enable": true,
        "parse-pure-ip": true,
        "sniff": {
            "TLS": {
                "ports": [
                    "443",
                    "8443"
                ]
            },
            "HTTP": {
                "ports": [
                    "80",
                    "8080-8880"
                ],
                "override-destination": true
            },
            "QUIC": {
                "ports": [
                    "443",
                    "8443"
                ]
            }
        }
    };

    // 覆盖 tun
    config['tun'] = {
        "enable": true,
        "stack": "mixed",
        "dns-hijack": [
            "any:53"
        ]
    };

    // 按 SUBS 展开主/辅/VPS 策略组
    config['proxy-groups'] = layoutProxyGroups(GROUP_TEMPLATES, {
        subscriptions: SUBS,
        excludePattern: EXCLUDE_PATTERN,
        includeAll: true,
    }).map(finalizePartyGroup);

    // 覆盖规则集
    config['rule-providers'] = {
        "ad_clash": {
            "type": "http",
            "behavior": "domain",
            "format": "yaml",
            "url": "https://anti-ad.net/clash.yaml",
            "path": "./ruleset/sounfury/ad_clash.yaml",
            "interval": 86400
        },
        "ad_adblockclashlite": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblockclashlite.list",
            "path": "./ruleset/sounfury/ad_adblockclashlite.list",
            "interval": 86400
        },
        "ad_reject": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/PosvdM/Clash-rules/main/list/reject.list",
            "path": "./ruleset/sounfury/ad_reject.list",
            "interval": 86400
        },
        "proxy_google_play": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/google-play.list",
            "path": "./ruleset/sounfury/proxy_google_play.list",
            "interval": 86400
        },
        "direct_direct": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/direct.list",
            "path": "./ruleset/sounfury/direct_direct.list",
            "interval": 86400
        },
        "direct_ChinaDomain": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list",
            "path": "./ruleset/sounfury/direct_ChinaDomain.list",
            "interval": 86400
        },
        "direct_ChinaCompanyIp": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list",
            "path": "./ruleset/sounfury/direct_ChinaCompanyIp.list",
            "interval": 86400
        },
        "direct_Download": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list",
            "path": "./ruleset/sounfury/direct_Download.list",
            "interval": 86400
        },
        "direct_apple_cdn": {
            "type": "http",
            "behavior": "domain",
            "format": "text",
            "url": "https://ruleset.skk.moe/Clash/domainset/apple_cdn.txt",
            "path": "./ruleset/sounfury/direct_apple_cdn.list",
            "interval": 86400
        },
        "direct_apple_cn": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://ruleset.skk.moe/Clash/non_ip/apple_cn.txt",
            "path": "./ruleset/sounfury/direct_apple_cn.list",
            "interval": 86400
        },
        "direct_apple_services": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://ruleset.skk.moe/Clash/non_ip/apple_services.txt",
            "path": "./ruleset/sounfury/direct_apple_services.list",
            "interval": 86400
        },
        "direct_UnBan": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list",
            "path": "./ruleset/sounfury/direct_UnBan.list",
            "interval": 86400
        },
        "direct_Microsoft": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list",
            "path": "./ruleset/sounfury/direct_Microsoft.list",
            "interval": 86400
        },
        "ai_ai": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/ai.list",
            "path": "./ruleset/sounfury/ai_ai.list",
            "interval": 86400
        },
        "ai_ai_1": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://ruleset.skk.moe/Clash/non_ip/ai.txt",
            "path": "./ruleset/sounfury/ai_ai_1.list",
            "interval": 86400
        },
        "low_low": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/low.list",
            "path": "./ruleset/sounfury/low_low.list",
            "interval": 86400
        },
        "env_env_repo": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/env-repo.list",
            "path": "./ruleset/sounfury/env_env_repo.list",
            "interval": 86400
        },
        "game_GamePlatform": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/LoveMyself666/ACL4SSR/master/Clash/GamePlatform.list",
            "path": "./ruleset/sounfury/game_GamePlatform.list",
            "interval": 86400
        },
        "emby_Emby": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/Emby.list",
            "path": "./ruleset/sounfury/emby_Emby.list",
            "interval": 86400
        },
        "spotify_Spotify": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/Spotify.list",
            "path": "./ruleset/sounfury/spotify_Spotify.list",
            "interval": 86400
        },
        "ehentai_ehentai": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/ehentai.list",
            "path": "./ruleset/sounfury/ehentai_ehentai.list",
            "interval": 86400
        },
        "sexy_sexy": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/sexy.list",
            "path": "./ruleset/sounfury/sexy_sexy.list",
            "interval": 86400
        },
        "tg_telegram": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://ruleset.skk.moe/Clash/non_ip/telegram.txt",
            "path": "./ruleset/sounfury/tg_telegram.list",
            "interval": 86400
        },
        "tg_telegram_1": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://ruleset.skk.moe/Clash/ip/telegram.txt",
            "path": "./ruleset/sounfury/tg_telegram_1.list",
            "interval": 86400
        },
        "proxy_GoogleFCM": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list",
            "path": "./ruleset/sounfury/proxy_GoogleFCM.list",
            "interval": 86400
        },
        "proxy_Netflix": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list",
            "path": "./ruleset/sounfury/proxy_Netflix.list",
            "interval": 86400
        },
        "proxy_Netflix_1": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/LM-Firefly/Rules/master/Global-Services/Netflix.list",
            "path": "./ruleset/sounfury/proxy_Netflix_1.list",
            "interval": 86400
        },
        "proxy_DisneyPlus": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/DisneyPlus.list",
            "path": "./ruleset/sounfury/proxy_DisneyPlus.list",
            "interval": 86400
        },
        "proxy_Bahamut": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Bahamut.list",
            "path": "./ruleset/sounfury/proxy_Bahamut.list",
            "interval": 86400
        },
        "proxy_proxy": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/proxy.list",
            "path": "./ruleset/sounfury/proxy_proxy.list",
            "interval": 86400
        },
        "proxy_ProxyLite": {
            "type": "http",
            "behavior": "classical",
            "format": "text",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list",
            "path": "./ruleset/sounfury/proxy_ProxyLite.list",
            "interval": 86400
        }
    };

    // 覆盖规则
    config['rules'] = [
        "RULE-SET,ad_clash,🛑 广告隐私",
        "RULE-SET,ad_adblockclashlite,🛑 广告隐私",
        "RULE-SET,ad_reject,🛑 广告隐私",
        "RULE-SET,proxy_google_play,🚀 国外网站",
        "RULE-SET,direct_direct,🎯 全球直连",
        "RULE-SET,direct_ChinaDomain,🎯 全球直连",
        "RULE-SET,direct_ChinaCompanyIp,🎯 全球直连",
        "RULE-SET,direct_Download,🎯 全球直连",
        "RULE-SET,direct_apple_cdn,🎯 全球直连",
        "RULE-SET,direct_apple_cn,🎯 全球直连",
        "RULE-SET,direct_apple_services,🎯 全球直连",
        "RULE-SET,direct_UnBan,🎯 全球直连",
        "RULE-SET,direct_Microsoft,🎯 全球直连",
        "RULE-SET,ai_ai,🤖 AI",
        "RULE-SET,ai_ai_1,🤖 AI",
        "RULE-SET,low_low,📦 大宗流量",
        "RULE-SET,env_env_repo,💻 环境仓库",
        "RULE-SET,game_GamePlatform,🎮 游戏服务",
        "RULE-SET,emby_Emby,Emby",
        "RULE-SET,spotify_Spotify,Spotify",
        "RULE-SET,ehentai_ehentai,📚 E站",
        "RULE-SET,sexy_sexy,🥵 不许涩涩",
        "RULE-SET,tg_telegram,Telegram",
        "RULE-SET,tg_telegram_1,Telegram",
        "RULE-SET,proxy_GoogleFCM,🚀 国外网站",
        "RULE-SET,proxy_Netflix,🚀 国外网站",
        "RULE-SET,proxy_Netflix_1,🚀 国外网站",
        "RULE-SET,proxy_DisneyPlus,🚀 国外网站",
        "RULE-SET,proxy_Bahamut,🚀 国外网站",
        "RULE-SET,proxy_proxy,🚀 国外网站",
        "RULE-SET,proxy_ProxyLite,🚀 国外网站",
        "GEOSITE,cn,🎯 全球直连",
        "GEOIP,CN,🎯 全球直连,no-resolve",
        "MATCH,🐟 漏网之鱼"
    ];

    return config;
}
