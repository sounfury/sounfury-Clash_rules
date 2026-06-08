#!/usr/bin/env node
/**
 * generate.js
 * 读取 source.yaml，生成三种客户端产物：
 *   output/subconverter/main.ini    — subconverter 远程配置
 *   output/subconverter/base.yml    — Clash 基础模板（DNS/hosts）
 *   output/party/override.js        — mihomo-party 覆写脚本
 *   output/stash/override.stoverride— Stash 覆写
 */

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─── 路径常量 ─────────────────────────────────────────────────
const ROOT        = path.resolve(__dirname, '..');
const SOURCE_FILE = path.join(ROOT, 'source.yaml');
const OUT_SUB     = path.join(ROOT, 'output', 'subconverter');
const OUT_PARTY   = path.join(ROOT, 'output', 'party');
const OUT_STASH   = path.join(ROOT, 'output', 'stash');

const VERBOSE = process.argv.includes('--verbose');

// ─── 工具函数 ─────────────────────────────────────────────────

function log(msg) {
    if (VERBOSE) console.log('[generate]', msg);
}

/** 递归创建目录 */
function mkdirs(...dirs) {
    for (const d of dirs) fs.mkdirSync(d, { recursive: true });
}

/** 将 $self 替换为仓库 Raw 前缀 */
function resolveSelf(url, rawBase) {
    return url.replace(/^\$self/, rawBase);
}

/** 剥离名称开头的 Emoji 字符及其后空格（Unicode Emoji_Presentation 属性匹配） */
function stripLeadingEmoji(name) {
    return name.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\uFE0F?\s*/u, '');
}

/**
 * 构建「有 icon 的组」名称映射表：原始 emoji 名 → 去 emoji 名。
 * 仅 JS / stoverride 产物使用，INI 继续保留完整 emoji 名。
 */
function buildNameMap() {
    const map = {};
    for (const pg of src.proxy_groups) {
        if (pg.icon) {
            const stripped = stripLeadingEmoji(pg.name);
            if (stripped !== pg.name) map[pg.name] = stripped;
        }
    }
    return map;
}

/**
 * 将 EXCLUDE_PATTERN 合并为负向 lookahead，注入到 include-all 组的 filter 中。
 * - 无既有 filter：生成纯负向过滤 (?i)^(?!.*PATTERN).*
 * - 有既有 filter 且以 (?i)^ 开头：在 ^ 后插入负向 lookahead
 * - 有既有 filter 且以 ^ 开头：同上，保留 (?i)
 * - 其他（如不带锚点的简单词组）：在前方直接前置 lookahead
 */
function mergeExcludeFilter(existingFilter) {
    const neg = `(?!.*(?:${EXCLUDE_PATTERN}))`;
    if (!existingFilter) {
        return `(?i)^${neg}.*`;
    }
    if (/^\(\?i\)\^/.test(existingFilter)) {
        return existingFilter.replace(/^\(\?i\)\^/, `(?i)^${neg}`);
    }
    if (/^\^/.test(existingFilter)) {
        return existingFilter.replace(/^\^/, `(?i)^${neg}`);
    }
    // fallback：前置负向 lookahead，不破坏原有逻辑
    return `${neg}${existingFilter}`;
}

/**
 * 中文策略组名 → 短 ASCII 前缀映射表（新增策略组时在此补充）
 */
const GROUP_PREFIX = {
    '🛑 广告隐私': 'ad',
    '🎯 全球直连': 'direct',
    '🤖 AI':      'ai',
    '📦 大宗流量': 'low',
    '💻 环境仓库': 'env',
    '🎮 游戏服务': 'game',
    '📺 Emby':    'emby',
    '🎶 Spotify': 'spotify',
    '📚 E站':     'ehentai',
    '🥵 不许涩涩': 'sexy',
    '📨 Telegram': 'tg',
    '🚀 国外网站': 'proxy',
};

/**
 * 从规则 URL 派生一个合法的纯 ASCII rule-provider key。
 * 取 URL 最后一段路径（去掉扩展名）作为文件名部分，
 * 加策略组 ASCII 前缀，确保全局唯一。
 */
function urlToKey(url, group) {
    const raw      = url.replace(/^\$self/, '');
    const basename = path.basename(raw).replace(/\.[^.]+$/, '');
    const prefix   = GROUP_PREFIX[group] || group.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    // 清理非 ASCII 字符，保留字母数字下划线
    const filePart = basename.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return `${prefix}_${filePart}`;
}

// ─── 读取数据源 ───────────────────────────────────────────────

const src = yaml.load(fs.readFileSync(SOURCE_FILE, 'utf8'));
const RAW_BASE = src.meta.raw_base;
// (?i) 是 subconverter 专用语法；剥离后用于 JS RegExp 和 filter 负向注入
const EXCLUDE_PATTERN = (src.exclude_remarks || '').replace(/^\(\?i\)/, '');

log(`RAW_BASE = ${RAW_BASE}`);

// ─── 1. 生成 subconverter/base.yml ───────────────────────────

function genBaseYml() {
    const out = yaml.dump(
        { dns: src.dns, hosts: src.hosts },
        { lineWidth: 120, quotingType: '"', noCompatMode: true }
    );
    fs.writeFileSync(path.join(OUT_SUB, 'base.yml'), out, 'utf8');
    log('写入 output/subconverter/base.yml');
}

// ─── 2. 生成 subconverter/main.ini ───────────────────────────

function genMainIni() {
    const lines = ['[custom]'];

    // exclude_remarks
    lines.push(`exclude_remarks=${src.exclude_remarks}`);
    lines.push('');

    // ruleset 行
    lines.push('# 规则组');
    for (const rs of src.rulesets) {
        const groupName = rs.group;
        lines.push('');
        lines.push(`## ${groupName}`);
        for (const rule of rs.rules) {
            const resolved = resolveSelf(rule.url, RAW_BASE);
            const prefix   = rule.ini_prefix || '';
            const interval = rule.interval ? `,${rule.interval}` : '';
            lines.push(`ruleset=${groupName},${prefix}${resolved}${interval}`);
        }
    }

    // 尾部规则 (GEOSITE/GEOIP/MATCH)
    lines.push('');
    for (const tr of src.tail_rules) {
        lines.push(`ruleset=${tr.group},[]${tr.literal}`);
    }

    lines.push('');
    lines.push('# 策略组');

    // custom_proxy_group 行
    for (const pg of src.proxy_groups) {
        const name = pg.name;
        const type = pg.type;

        if (type === 'select') {
            if (pg.proxies && pg.proxies.length > 0) {
                // 有明确 proxies 列表时直接输出
                const items = pg.proxies.map(p => `[]${p}`).join('`');
                lines.push(`custom_proxy_group=${name}\`select\`${items}`);
            } else if (pg.filter) {
                // 无 proxies 但有 filter（如冷门节点）：subconverter select 支持正则筛选
                lines.push(`custom_proxy_group=${name}\`select\`${pg.filter}`);
            } else {
                lines.push(`custom_proxy_group=${name}\`select\`[]DIRECT`);
            }
        } else if (type === 'url-test') {
            // filter 正则 + url + interval,tolerance,maxfailed
            const filter   = pg.filter || '';
            const url      = pg.url    || 'http://www.gstatic.com/generate_204';
            const interval = pg.interval  || 300;
            const tol      = pg.tolerance || 50;
            lines.push(`custom_proxy_group=${name}\`url-test\`${filter}\`${url}\`${interval},${tol}`);
        }
        // 其他 type 暂不支持（fallback/load-balance 未使用）
    }

    lines.push('');
    lines.push('enable_rule_generator=true');
    lines.push('overwrite_original_rules=true');
    lines.push('');
    // clash_rule_base 指向自动生成的 base.yml
    const baseYmlRaw = `${RAW_BASE.replace('/main', '/refs/heads/main')}/output/subconverter/base.yml`;
    lines.push(`clash_rule_base=${baseYmlRaw}`);
    lines.push('');

    fs.writeFileSync(path.join(OUT_SUB, 'main.ini'), lines.join('\n'), 'utf8');
    log('写入 output/subconverter/main.ini');
}

// ─── 3. 生成 output/party/override.js ────────────────────────

/**
 * 构建 rule-providers 对象（JS/stoverride 共用，返回 JS 对象）。
 * key 由 urlToKey() 生成；同名 key 自动加数字后缀。
 */
function buildRuleProviders() {
    const providers = {};
    const keyCount  = {};

    for (const rs of src.rulesets) {
        for (const rule of rs.rules) {
            let key = urlToKey(rule.url, rs.group);
            // 处理重名
            if (keyCount[key] === undefined) {
                keyCount[key] = 0;
            } else {
                keyCount[key]++;
                key = `${key}_${keyCount[key]}`;
            }

            const resolvedUrl = resolveSelf(rule.url, RAW_BASE);
            providers[key] = {
                type:     'http',
                behavior: rule.behavior || 'classical',
                format:   rule.format   || 'text',
                url:      resolvedUrl,
                path:     `./ruleset/sounfury/${key}.${rule.format === 'yaml' ? 'yaml' : 'list'}`,
                interval: rule.interval || 86400,
            };
        }
    }
    return providers;
}

/**
 * 构建 rules 数组（JS/stoverride 共用）。
 * 对应 rule-providers 的 key 与 buildRuleProviders() 保持一致顺序。
 * nameMap: 有 icon 的组名映射，保证规则中的 group 引用与 proxy-groups name 一致。
 */
function buildRules(nameMap = {}) {
    const rules    = [];
    const keyCount = {};

    for (const rs of src.rulesets) {
        for (const rule of rs.rules) {
            let key = urlToKey(rule.url, rs.group);
            if (keyCount[key] === undefined) {
                keyCount[key] = 0;
            } else {
                keyCount[key]++;
                key = `${key}_${keyCount[key]}`;
            }
            // 若该组有 icon，rules 中的目标组名同步替换为无 emoji 版本
            const groupName = nameMap[rs.group] ?? rs.group;
            rules.push(`RULE-SET,${key},${groupName}`);
        }
    }

    // 追加尾部规则
    for (const tr of src.tail_rules) {
        const suffix = tr.literal.startsWith('GEOIP') ? ',no-resolve' : '';
        const groupName = nameMap[tr.group] ?? tr.group;
        rules.push(`${tr.literal},${groupName}${suffix}`);
    }

    return rules;
}

/**
 * 构建 proxy-groups 数组（JS 格式，保留全量字段）。
 * nameMap: 有 icon 的组「emoji名 → 无emoji名」，用于同步重命名 proxies 引用。
 */
function buildProxyGroups(nameMap = {}) {
    return src.proxy_groups.map(pg => {
        // 有 icon 时去掉 name 开头的 emoji，避免客户端同时显示 emoji 和图标
        const resolvedName = nameMap[pg.name] ?? pg.name;
        const g = {
            interval: 300,
            url:      'http://www.gstatic.com/generate_204',
            'max-failed-times': 3,
            name: resolvedName,
            type: pg.type,
        };
        // proxies 中的引用也需同步替换为新名
        if (pg.proxies)      g.proxies      = pg.proxies.map(p => nameMap[p] ?? p);
        if (pg['include-all'] !== undefined) g['include-all'] = pg['include-all'];
        // include-all 组自动注入 exclude_remarks 负向过滤，无需额外 filter.js
        if (pg['include-all']) {
            g.filter = mergeExcludeFilter(pg.filter);
        } else if (pg.filter) {
            g.filter = pg.filter;
        }
        if (pg.url)          g.url          = pg.url;
        if (pg.interval)     g.interval     = pg.interval;
        if (pg.tolerance !== undefined) g.tolerance = pg.tolerance;
        if (pg.icon)         g.icon         = pg.icon;
        // 对 select 类型去掉 url 等测速字段
        if (pg.type === 'select') {
            delete g.url;
            delete g.interval;
            delete g['max-failed-times'];
        }
        return g;
    });
}

function genPartyJs() {
    const nameMap    = buildNameMap();
    const providers  = buildRuleProviders();
    const rules      = buildRules(nameMap);
    const groups     = buildProxyGroups(nameMap);

    // 构建 general 字段覆盖代码
    const generalLines = Object.entries(src.general || {})
        .map(([k, v]) => `    config[${JSON.stringify(k)}] = ${JSON.stringify(v)};`)
        .join('\n');

    const jsContent = `/**
 * override.js — mihomo-party 覆写脚本（自动生成，勿手动编辑）
 * 数据源：source.yaml
 */

// 策略组通用配置
const groupBase = {
    interval: 300,
    url: 'http://1.1.1.1/generate_204',
    'max-failed-times': 3,
};

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
    const _excReg = new RegExp(${JSON.stringify(EXCLUDE_PATTERN)}, 'i');
    if (Array.isArray(config.proxies)) {
        config.proxies = config.proxies.filter(p => !_excReg.test(p.name));
    }

    // 覆盖通用参数
${generalLines}

    // 覆盖 DNS
    config['dns'] = ${JSON.stringify(src.dns, null, 4).replace(/^/gm, '    ').trim()};

    // 覆盖 sniffer
    config['sniffer'] = ${JSON.stringify(src.sniffer, null, 4).replace(/^/gm, '    ').trim()};

    // 覆盖 tun
    config['tun'] = ${JSON.stringify(src.tun, null, 4).replace(/^/gm, '    ').trim()};

    // 覆盖策略组
    config['proxy-groups'] = ${JSON.stringify(groups, null, 4).replace(/^/gm, '    ').trim()};

    // 覆盖规则集
    config['rule-providers'] = ${JSON.stringify(providers, null, 4).replace(/^/gm, '    ').trim()};

    // 覆盖规则
    config['rules'] = ${JSON.stringify(rules, null, 4).replace(/^/gm, '    ').trim()};

    return config;
}
`;

    fs.writeFileSync(path.join(OUT_PARTY, 'override.js'), jsContent, 'utf8');
    log('写入 output/party/override.js');
}

// ─── 4. 生成 output/stash/override.stoverride ────────────────

/**
 * 简单 YAML 序列化，对数组添加 #!replace 注释。
 * Stash 的 #!replace 需要紧跟在 key 后面的同行注释中。
 */
function genStoverride() {
    const nameMap   = buildNameMap();
    const providers = buildRuleProviders();
    const rules     = buildRules(nameMap);
    const groups    = src.proxy_groups.map(pg => {
        // 同 genPartyJs：有 icon 的组去掉开头 emoji
        const resolvedName = nameMap[pg.name] ?? pg.name;
        const g = { name: resolvedName, type: pg.type };
        if (pg.proxies)      g.proxies      = pg.proxies.map(p => nameMap[p] ?? p);
        if (pg['include-all'] !== undefined) g['include-all'] = pg['include-all'];
        // include-all 组同步注入 exclude_remarks 负向过滤
        if (pg['include-all']) {
            g.filter = mergeExcludeFilter(pg.filter);
        } else if (pg.filter) {
            g.filter = pg.filter;
        }
        if (pg.url)          g.url          = pg.url;
        if (pg.interval)     g.interval     = pg.interval;
        if (pg.tolerance !== undefined) g.tolerance = pg.tolerance;
        if (pg.icon)         g.icon         = pg.icon;
        return g;
    });

    // 构建 dns 段，数组子字段加 #!replace
    const dnsReplaceFields = [
        'fake-ip-filter',
        'default-nameserver',
        'nameserver',
        'proxy-server-nameserver',
        'fallback',
        'fallback-filter',
        'nameserver-policy',
    ];

    // 用 js-yaml 序列化各段，再手动插入 #!replace
    function injectReplace(yamlStr, fields) {
        let result = yamlStr;
        for (const field of fields) {
            // 匹配 "  field:" 并在冒号后加 " #!replace"
            result = result.replace(
                new RegExp(`^(\\s+${field}):`, 'm'),
                `$1: #!replace`
            );
        }
        return result;
    }

    const dnsYaml = injectReplace(
        yaml.dump({ dns: src.dns }, { lineWidth: 120, noCompatMode: true }),
        dnsReplaceFields
    );

    const hostsYaml = yaml.dump({ hosts: src.hosts }, { noCompatMode: true })
        .replace(/^(hosts):/, '$1: #!replace');

    const groupsYaml = yaml.dump(
        { 'proxy-groups': groups },
        { lineWidth: 200, noCompatMode: true }
    ).replace(/^(proxy-groups):/, '$1: #!replace');

    const providersYaml = yaml.dump(
        { 'rule-providers': providers },
        { lineWidth: 200, noCompatMode: true }
    ).replace(/^(rule-providers):/, '$1: #!replace');

    const rulesYaml = yaml.dump(
        { rules },
        { lineWidth: 200, noCompatMode: true }
    ).replace(/^(rules):/, '$1: #!replace');

    // 从 source.yaml meta.stash 读取覆写元数据，保持 SSoT
    const stashMeta = src.meta.stash || {};
    const stashName = stashMeta.name || 'sounfury 主规则覆写';
    const stashDesc = stashMeta.desc || '由 generate.js 从 source.yaml 自动生成，勿手动编辑。';
    const stashIcon = stashMeta.icon ? `icon: ${stashMeta.icon}\n` : '';

    const header = `name: ${stashName}
desc: ${stashDesc}
${stashIcon}
# Stash 覆写默认会把数组插入到原数组前面；
# 这里使用 #!replace 完整替换，模拟 subconverter 的 overwrite_original_rules=true。

`;

    const content = header + dnsYaml + '\n' + hostsYaml + '\n'
        + groupsYaml + '\n' + providersYaml + '\n' + rulesYaml;

    fs.writeFileSync(path.join(OUT_STASH, 'override.stoverride'), content, 'utf8');
    log('写入 output/stash/override.stoverride');
}

// ─── 主流程 ───────────────────────────────────────────────────

function main() {
    console.log('generate.js 开始执行...');
    mkdirs(OUT_SUB, OUT_PARTY, OUT_STASH);

    genBaseYml();
    genMainIni();
    genPartyJs();
    genStoverride();

    console.log('✅ 生成完毕：');
    console.log('   output/subconverter/base.yml');
    console.log('   output/subconverter/main.ini');
    console.log('   output/party/override.js');
    console.log('   output/stash/override.stoverride');
}

main();
