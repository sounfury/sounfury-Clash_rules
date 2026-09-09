/**
 * 主/辅/VPS 前缀布局。
 * generate.js 在 Node 里 require；也会整段嵌入 Party override.js。
 *
 * 约定：
 *   prefix 以 ^ 或 (?i)^ 开头 → 锚定正则（如 ^🗄️）
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AUX_WRAPPER_NAME,
        composeFilter,
        resolveSubscriptions,
        layoutProxyGroups,
    };
}
