/**
 * 已废弃：本地 proxy-providers 双机场聚合只兼容 Clash Party。
 * 正式方案改走云端加 [🌸]/[H]/oracle 前缀 + source.yaml subscriptions。
 *
 * 实验：双机场隔离 — 纯 JS 覆写（仅电脑端 mihomo-party）
 * experiments/dual-airport-pc/override.js
 *
 * 不依赖 profile 里写 proxy-providers / 策略组 / 规则：
 *   main() 内强制注入 providers + groups + rules。
 *
 * 花云 Flower → 日常（地区 / AI / 游戏 / 漏网…）
 * Hneko       → Emby + Telegram + 📦 大宗流量
 *
 * Party 用法：
 *   1. 任意本地空配置挂上本覆写即可（不必写 yaml providers）
 *   2. 花云阅后即焚 YAML 放到（相对 work）：
 *        %APPDATA%\mihomo-party\work\proxies\Flower_Trojan.yaml
 *   3. Hneko 用 type:http：订阅写 url，path 只写本地缓存文件
 *   4. 改路径只改本文件顶部 PROVIDER_SPECS
 *
 * 注意：新版 mihomo 已移除 global-client-fingerprint，
 * 指纹改由 provider.override.client-fingerprint 写到每个节点上。
 */

// ── 唯一需要改的地方：节点源 ─────────────────────────────────
// path 必须是 HomeDir 下的相对路径（Party 校验时 HomeDir 可能是 work 或 test）
// http 订阅：url = 远程链接；path = 本地缓存。二者不能对调。
const PROVIDER_FLOWER = 'Flower';
const PROVIDER_HNEKO = 'Hneko';
const CLIENT_FINGERPRINT = 'chrome';

const PROVIDER_SPECS = {
    [PROVIDER_FLOWER]: {
        type: 'file',
        path: './proxies/Flower_Trojan.yaml',
        // 绝对路径备选（SAFE_PATHS 限制时优先放在 work 下）：
        // path: 'C:/Users/Administrator/AppData/Roaming/mihomo-party/work/proxies/Flower_Trojan.yaml',
        'health-check': {
            enable: true,
            url: 'https://www.gstatic.com/generate_204',
            interval: 300,
            lazy: true,
        },
        override: {
            'additional-prefix': '[花] ',
            'client-fingerprint': CLIENT_FINGERPRINT,
        },
    },
    [PROVIDER_HNEKO]: {
        type: 'http',
        // 订阅写 url，不要写进 path。token 只放本机 Party 覆写，勿提交仓库。
        url: 'https://YOUR_HNEKO_SUBSCRIBE_URL',
        path: './proxies/Hneko.yaml',
        interval: 3600,
        'health-check': {
            enable: true,
            url: 'https://www.gstatic.com/generate_204',
            interval: 300,
            lazy: true,
        },
        override: {
            'additional-prefix': '[H] ',
            'client-fingerprint': CLIENT_FINGERPRINT,
        },
    },
};

const EXCLUDE_REMARKS =
    '(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)';
const EXCLUDE_FILTER = `(?i)${EXCLUDE_REMARKS}`;

const groupBase = {
    interval: 300,
    url: 'http://www.gstatic.com/generate_204',
    'max-failed-times': 3,
};

/**
 * 深拷贝一份 provider 定义并挂上统一 exclude-filter
 * @param {Record<string, any>} spec
 */
function cloneProviderSpec(spec) {
    const cloned = {
        type: spec.type,
        path: spec.path,
        'exclude-filter': EXCLUDE_FILTER,
        'health-check': { ...(spec['health-check'] || {}) },
    };
    if (spec.url) {
        cloned.url = spec.url;
    }
    if (spec.interval != null) {
        cloned.interval = spec.interval;
    }
    cloned.override = {
        'client-fingerprint': CLIENT_FINGERPRINT,
        ...(spec.override || {}),
    };
    return cloned;
}

/**
 * 新版内核不再接受全局指纹，按节点补上 client-fingerprint。
 * @param {Record<string, any>} config
 */
function applyClientFingerprintToProxies(config) {
    if (!Array.isArray(config.proxies)) {
        return;
    }
    for (const proxy of config.proxies) {
        if (!proxy || typeof proxy !== 'object') {
            continue;
        }
        if (proxy['client-fingerprint']) {
            continue;
        }
        proxy['client-fingerprint'] = CLIENT_FINGERPRINT;
    }
}

/**
 * 强制用 JS 注入双机场 providers；清空 profile 内联 proxies，避免混入
 * @param {Record<string, any>} config
 */
function injectProvidersFromJs(config) {
    const providers = {};
    for (const [providerName, providerSpec] of Object.entries(PROVIDER_SPECS)) {
        providers[providerName] = cloneProviderSpec(providerSpec);
    }
    config['proxy-providers'] = providers;
    // 节点只来自 providers，不吃订阅 profile 里的 proxies
    config.proxies = [];
}

/**
 * 花云地区 / 自动组：use 仅 Flower
 * @param {string} name
 * @param {string} filter
 * @param {'url-test'|'select'} [type]
 */
function flowerGroup(name, filter, type = 'url-test') {
    const group = {
        ...groupBase,
        name,
        type,
        use: [PROVIDER_FLOWER],
        filter: `(?!.*(?:${EXCLUDE_REMARKS}))${filter}`,
    };
    if (type === 'url-test') {
        group.tolerance = 5;
    }
    return group;
}

/**
 * @param {Record<string, any>} config
 * @returns {Record<string, any>}
 */
function main(config) {
    injectProvidersFromJs(config);

    config['mixed-port'] = 7890;
    config['tcp-concurrent'] = true;
    config['allow-lan'] = true;
    config['ipv6'] = false;
    config['log-level'] = 'info';
    config['unified-delay'] = true;
    config['find-process-mode'] = 'strict';
    delete config['global-client-fingerprint'];
    applyClientFingerprintToProxies(config);

    config.dns = {
        enable: true,
        ipv6: true,
        'use-hosts': true,
        'prefer-h3': true,
        listen: '0.0.0.0:53',
        'enhanced-mode': 'fake-ip',
        'fake-ip-range': '198.18.0.1/16',
        'fake-ip-filter': [
            '*',
            '+.lan',
            '+.local',
            'time.*.com',
            'ntp.*.com',
            '+.market.xiaomi.com',
        ],
        'default-nameserver': ['https://223.5.5.5/dns-query'],
        nameserver: ['https://dns.alidns.com/dns-query'],
        'proxy-server-nameserver': [
            'https://dns.alidns.com/dns-query',
            'https://doh.pub/dns-query',
        ],
        fallback: ['https://dns.cloudflare.com/dns-query'],
        'fallback-filter': {
            geoip: true,
            'geoip-code': 'CN',
            geosite: ['gfw'],
            ipcidr: ['240.0.0.0/4'],
        },
        'nameserver-policy': {
            'geosite:cn,private,apple': 'https://dns.alidns.com/dns-query',
            'geosite:!cn,gfw': 'https://posvdm.cloudflare-gateway.com/dns-query',
        },
    };

    config.sniffer = {
        enable: true,
        'parse-pure-ip': true,
        sniff: {
            TLS: { ports: ['443', '8443'] },
            HTTP: { ports: ['80', '8080-8880'], 'override-destination': true },
            QUIC: { ports: ['443', '8443'] },
        },
    };

    config.tun = {
        enable: true,
        stack: 'mixed',
        'dns-hijack': ['any:53'],
    };

    // Emby 侧大量日区出口被 ban，加速池剔除日本节点
    const hnekoPool = {
        ...groupBase,
        name: '🎬 Hneko加速',
        type: 'url-test',
        use: [PROVIDER_HNEKO],
        filter: `(?i)^(?!.*(?:${EXCLUDE_REMARKS}))(?!.*(?:🇯🇵|日本|东京|東京|Japan|Tokyo|\\bJP\\b)).*`,
        tolerance: 50,
    };

    config['proxy-groups'] = [
        {
            name: '👋 手动切换',
            type: 'select',
            proxies: [
                '⚡ 自动选择',
                '🇭🇰 香港节点',
                '🇺🇲 美国节点',
                '🇸🇬 狮城节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🇪🇺 欧洲节点',
                '🇹🇷 土耳其节点',
                '🐔 小鸡节点',
                '🏷️ 低倍率',
                '🧊 冷门节点',
                '🎬 Hneko加速',
                'DIRECT',
            ],
        },
        {
            name: '🚀 国外网站',
            type: 'select',
            proxies: ['⚡ 自动选择', '👋 手动切换'],
        },
        {
            name: 'Telegram',
            type: 'select',
            proxies: [
                '🎬 Hneko加速',
                '⚡ 自动选择',
                '🏷️ 低倍率',
                '🇭🇰 香港节点',
                '🇺🇲 美国节点',
                '🇸🇬 狮城节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🧊 冷门节点',
                '👋 手动切换',
            ],
            icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Telegram.png',
        },
        {
            name: '🤖 AI',
            type: 'select',
            proxies: [
                '🇸🇬 狮城节点',
                '🐔 小鸡节点',
                '🏷️ 低倍率',
                '🇭🇰 香港节点',
                '🇺🇲 美国节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🧊 冷门节点',
                '👋 手动切换',
            ],
        },
        {
            name: '🎮 游戏服务',
            type: 'select',
            proxies: [
                '🇸🇬 狮城节点',
                '🐔 小鸡节点',
                '🏷️ 低倍率',
                '🇭🇰 香港节点',
                '🇺🇲 美国节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🧊 冷门节点',
                '👋 手动切换',
                'DIRECT',
            ],
        },
        {
            name: 'Emby',
            type: 'select',
            proxies: [
                '🎬 Hneko加速',
                'DIRECT',
                '🇭🇰 香港节点',
                '🇸🇬 狮城节点',
                '🇯🇵 日本节点',
                '🇺🇲 美国节点',
                '👋 手动切换',
            ],
            icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Emby.png',
        },
        {
            name: 'Spotify',
            type: 'select',
            proxies: [
                '🇹🇷 土耳其节点',
                '🏷️ 低倍率',
                '🇺🇲 美国节点',
                '🇭🇰 香港节点',
                '🇸🇬 狮城节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🧊 冷门节点',
                '👋 手动切换',
                'DIRECT',
            ],
            icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Spotify.png',
        },
        {
            name: '📚 E站',
            type: 'select',
            proxies: ['🇪🇺 欧洲节点', '🇺🇲 美国节点', '👋 手动切换'],
        },
        {
            name: '🥵 不许涩涩',
            type: 'select',
            proxies: [
                '🇸🇬 狮城节点',
                '🏷️ 低倍率',
                '🇭🇰 香港节点',
                '🇺🇲 美国节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🧊 冷门节点',
                '👋 手动切换',
                'DIRECT',
            ],
        },
        {
            name: '🐟 漏网之鱼',
            type: 'select',
            proxies: [
                '🇸🇬 狮城节点',
                '🏷️ 低倍率',
                '🇭🇰 香港节点',
                '🇺🇲 美国节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🧊 冷门节点',
                '👋 手动切换',
                'DIRECT',
            ],
        },
        {
            name: '📦 大宗流量',
            type: 'select',
            proxies: [
                '🎬 Hneko加速',
                'DIRECT',
                '🏷️ 低倍率',
                '🇸🇬 狮城节点',
                '🇭🇰 香港节点',
                '👋 手动切换',
            ],
        },
        {
            name: '💻 环境仓库',
            type: 'select',
            proxies: [
                '🏷️ 低倍率',
                '🐔 小鸡节点',
                '🇸🇬 狮城节点',
                '🇭🇰 香港节点',
                '🇺🇲 美国节点',
                '🇯🇵 日本节点',
                '🇹🇼 台湾节点',
                '🧊 冷门节点',
                '👋 手动切换',
                'DIRECT',
            ],
        },

        flowerGroup(
            '⚡ 自动选择',
            '(?i)^(?=.*(🇭🇰|香港|HK|Hong\\s*Kong|🇺🇲|🇺🇸|美国|US|United.?States|洛杉矶|圣何塞|🇸🇬|新加坡|狮城|SG|Singapore|🇯🇵|日本|东京|JP|Japan|🇹🇼|台湾|TW|Tai|Taiwan))(?!.*(实验|低倍率|小鸡|chicken|vps)).*',
        ),
        flowerGroup(
            '🏷️ 低倍率',
            '(?i)(实验|低倍率|低倍|0\\.[1-9]\\s*(?:x|倍)?|[1-5]折)',
        ),
        flowerGroup('🐔 小鸡节点', '(?i)chicken|vps|server|小鸡|鸡'),
        flowerGroup('🇭🇰 香港节点', '(?i)🇭🇰|香港|HK|Hong\\s*Kong'),
        flowerGroup('🇺🇲 美国节点', '(?i)🇺🇲|🇺🇸|美国|US|United.?States|洛杉矶|圣何塞'),
        flowerGroup('🇸🇬 狮城节点', '(?i)🇸🇬|新加坡|狮城|SG|Singapore'),
        flowerGroup(
            '🇪🇺 欧洲节点',
            '(?i)🇪🇺|欧洲|Europe|🇩🇪|德国|Germany|Frankfurt|法兰克福|Berlin|柏林|🇳🇱|荷兰|Netherlands|Amsterdam|阿姆斯特丹|🇬🇧|英国|United.?Kingdom|London|伦敦|🇫🇷|法国|France|Paris|巴黎|🇮🇪|爱尔兰|Ireland|Dublin|都柏林',
        ),
        flowerGroup('🇹🇷 土耳其节点', '(?i)🇹🇷|土耳其|TR|Turkey|Turkiye|Türkiye|Istanbul'),
        flowerGroup('🇯🇵 日本节点', '(?i)🇯🇵|日本|东京|JP|Japan'),
        flowerGroup('🇹🇼 台湾节点', '(?i)🇹🇼|台湾|TW|Taiwan|Tai'),
        flowerGroup(
            '🧊 冷门节点',
            '^(?!.*(🇭🇰|香港|HK|Hong|🇺🇸|🇺🇲|美国|洛杉矶|圣何塞|US|United.?States|🇸🇬|新加坡|狮|SG|Singapore|🇯🇵|日本|东京|JP|Japan|🇹🇼|台湾|TW|Tai|Taiwan|剩余|Expire|Traffic|GB)).*',
            'select',
        ),

        hnekoPool,

        {
            name: '🛑 广告隐私',
            type: 'select',
            proxies: ['REJECT', 'DIRECT'],
        },
        {
            name: '🎯 全球直连',
            type: 'select',
            proxies: ['DIRECT'],
        },
    ];

    config['rule-providers'] = {
        ad_clash: {
            type: 'http',
            behavior: 'domain',
            format: 'yaml',
            url: 'https://anti-ad.net/clash.yaml',
            path: './ruleset/sounfury/ad_clash.yaml',
            interval: 86400,
        },
        ad_adblockclashlite: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/217heidai/adblockfilters/main/rules/adblockclashlite.list',
            path: './ruleset/sounfury/ad_adblockclashlite.list',
            interval: 86400,
        },
        ad_reject: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/PosvdM/Clash-rules/main/list/reject.list',
            path: './ruleset/sounfury/ad_reject.list',
            interval: 86400,
        },
        direct_direct: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/direct.list',
            path: './ruleset/sounfury/direct_direct.list',
            interval: 86400,
        },
        direct_ChinaDomain: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list',
            path: './ruleset/sounfury/direct_ChinaDomain.list',
            interval: 86400,
        },
        direct_ChinaCompanyIp: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list',
            path: './ruleset/sounfury/direct_ChinaCompanyIp.list',
            interval: 86400,
        },
        direct_Download: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list',
            path: './ruleset/sounfury/direct_Download.list',
            interval: 86400,
        },
        direct_apple_cdn: {
            type: 'http',
            behavior: 'domain',
            format: 'text',
            url: 'https://ruleset.skk.moe/Clash/domainset/apple_cdn.txt',
            path: './ruleset/sounfury/direct_apple_cdn.list',
            interval: 86400,
        },
        direct_apple_cn: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://ruleset.skk.moe/Clash/non_ip/apple_cn.txt',
            path: './ruleset/sounfury/direct_apple_cn.list',
            interval: 86400,
        },
        direct_apple_services: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://ruleset.skk.moe/Clash/non_ip/apple_services.txt',
            path: './ruleset/sounfury/direct_apple_services.list',
            interval: 86400,
        },
        direct_UnBan: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list',
            path: './ruleset/sounfury/direct_UnBan.list',
            interval: 86400,
        },
        direct_Microsoft: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list',
            path: './ruleset/sounfury/direct_Microsoft.list',
            interval: 86400,
        },
        ai_ai: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/ai.list',
            path: './ruleset/sounfury/ai_ai.list',
            interval: 86400,
        },
        ai_ai_1: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://ruleset.skk.moe/Clash/non_ip/ai.txt',
            path: './ruleset/sounfury/ai_ai_1.list',
            interval: 86400,
        },
        low_low: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/low.list',
            path: './ruleset/sounfury/low_low.list',
            interval: 86400,
        },
        env_env_repo: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/env-repo.list',
            path: './ruleset/sounfury/env_env_repo.list',
            interval: 86400,
        },
        game_GamePlatform: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/LoveMyself666/ACL4SSR/master/Clash/GamePlatform.list',
            path: './ruleset/sounfury/game_GamePlatform.list',
            interval: 86400,
        },
        emby_Emby: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/Emby.list',
            path: './ruleset/sounfury/emby_Emby.list',
            interval: 86400,
        },
        spotify_Spotify: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/Spotify.list',
            path: './ruleset/sounfury/spotify_Spotify.list',
            interval: 86400,
        },
        ehentai_ehentai: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/ehentai.list',
            path: './ruleset/sounfury/ehentai_ehentai.list',
            interval: 86400,
        },
        sexy_sexy: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/sexy.list',
            path: './ruleset/sounfury/sexy_sexy.list',
            interval: 86400,
        },
        tg_telegram: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://ruleset.skk.moe/Clash/non_ip/telegram.txt',
            path: './ruleset/sounfury/tg_telegram.list',
            interval: 86400,
        },
        tg_telegram_1: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://ruleset.skk.moe/Clash/ip/telegram.txt',
            path: './ruleset/sounfury/tg_telegram_1.list',
            interval: 86400,
        },
        proxy_GoogleFCM: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list',
            path: './ruleset/sounfury/proxy_GoogleFCM.list',
            interval: 86400,
        },
        proxy_Netflix: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list',
            path: './ruleset/sounfury/proxy_Netflix.list',
            interval: 86400,
        },
        proxy_Netflix_1: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/LM-Firefly/Rules/master/Global-Services/Netflix.list',
            path: './ruleset/sounfury/proxy_Netflix_1.list',
            interval: 86400,
        },
        proxy_DisneyPlus: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/DisneyPlus.list',
            path: './ruleset/sounfury/proxy_DisneyPlus.list',
            interval: 86400,
        },
        proxy_Bahamut: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Bahamut.list',
            path: './ruleset/sounfury/proxy_Bahamut.list',
            interval: 86400,
        },
        proxy_proxy: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/rule/proxy.list',
            path: './ruleset/sounfury/proxy_proxy.list',
            interval: 86400,
        },
        proxy_ProxyLite: {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list',
            path: './ruleset/sounfury/proxy_ProxyLite.list',
            interval: 86400,
        },
    };

    config.rules = [
        'RULE-SET,ad_clash,🛑 广告隐私',
        'RULE-SET,ad_adblockclashlite,🛑 广告隐私',
        'RULE-SET,ad_reject,🛑 广告隐私',
        'RULE-SET,direct_direct,🎯 全球直连',
        'RULE-SET,direct_ChinaDomain,🎯 全球直连',
        'RULE-SET,direct_ChinaCompanyIp,🎯 全球直连',
        'RULE-SET,direct_Download,🎯 全球直连',
        'RULE-SET,direct_apple_cdn,🎯 全球直连',
        'RULE-SET,direct_apple_cn,🎯 全球直连',
        'RULE-SET,direct_apple_services,🎯 全球直连',
        'RULE-SET,direct_UnBan,🎯 全球直连',
        'RULE-SET,direct_Microsoft,🎯 全球直连',
        'RULE-SET,ai_ai,🤖 AI',
        'RULE-SET,ai_ai_1,🤖 AI',
        'RULE-SET,low_low,📦 大宗流量',
        'RULE-SET,env_env_repo,💻 环境仓库',
        'RULE-SET,game_GamePlatform,🎮 游戏服务',
        'RULE-SET,emby_Emby,Emby',
        'RULE-SET,spotify_Spotify,Spotify',
        'RULE-SET,ehentai_ehentai,📚 E站',
        'RULE-SET,sexy_sexy,🥵 不许涩涩',
        'RULE-SET,tg_telegram,Telegram',
        'RULE-SET,tg_telegram_1,Telegram',
        'RULE-SET,proxy_GoogleFCM,🚀 国外网站',
        'RULE-SET,proxy_Netflix,🚀 国外网站',
        'RULE-SET,proxy_Netflix_1,🚀 国外网站',
        'RULE-SET,proxy_DisneyPlus,🚀 国外网站',
        'RULE-SET,proxy_Bahamut,🚀 国外网站',
        'RULE-SET,proxy_proxy,🚀 国外网站',
        'RULE-SET,proxy_ProxyLite,🚀 国外网站',
        'GEOSITE,cn,🎯 全球直连',
        'GEOIP,CN,🎯 全球直连,no-resolve',
        'MATCH,🐟 漏网之鱼',
    ];

    return config;
}
