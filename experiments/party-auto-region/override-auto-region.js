/**
 * override.js — mihomo-party 覆写脚本（自动生成，勿手动编辑）
 * 数据源：source.yaml
 */

// 策略组通用配置
const groupBase = {
    interval: 300,
    url: 'http://1.1.1.1/generate_204',
    'max-failed-times': 3,
};

// 实验：根据订阅里的真实节点动态生成地区组，避免固定地区组为空。
const AUTO_REGION_GROUPS = [
    { name: '🇭🇰 香港节点', pattern: /🇭🇰|香港|\bHK\b|Hong\s*Kong/i },
    { name: '🇺🇲 美国节点', pattern: /🇺🇲|🇺🇸|美国|\bUS\b|United.?States|Los\s*Angeles|洛杉矶|San\s*Jose|圣何塞/i },
    { name: '🇸🇬 狮城节点', pattern: /🇸🇬|新加坡|狮城|\bSG\b|Singapore/i },
    { name: '🇯🇵 日本节点', pattern: /🇯🇵|日本|东京|\bJP\b|Japan|Tokyo/i },
    { name: '🇹🇼 台湾节点', pattern: /🇹🇼|台湾|\bTW\b|Taiwan|Taipei|台北/i },
    { name: '🇪🇺 欧洲节点', pattern: /🇪🇺|欧洲|歐洲|Europe|\bEU\b/i },
    { name: '🇹🇷 土耳其节点', pattern: /🇹🇷|土耳其|\bTR\b|Turkey|Turkiye|Türkiye|Istanbul|伊斯坦布尔/i },
    { name: '🇳🇬 尼日利亚节点', pattern: /🇳🇬|尼日利亚|奈及利亚|Nigeria|Nigerian|\bNG\b|Lagos|Abuja|拉各斯|阿布贾/i },
    { name: '🇬🇧 英国节点', pattern: /🇬🇧|英国|英國|\bUK\b|United.?Kingdom|Britain|London|伦敦/i },
    { name: '🇩🇪 德国节点', pattern: /🇩🇪|德国|德國|Germany|Frankfurt|Berlin|法兰克福|柏林/i },
    { name: '🇮🇹 意大利节点', pattern: /🇮🇹|意大利|Italy|Italia|\bMilan\b|\bMilano\b|\bRome\b|\bRoma\b|米兰|羅馬|罗马|\bIT\b/i },
    { name: '🇫🇷 法国节点', pattern: /🇫🇷|法国|法國|France|Paris|巴黎/i },
    { name: '🇳🇱 荷兰节点', pattern: /🇳🇱|荷兰|荷蘭|Netherlands|Amsterdam|阿姆斯特丹/i },
    { name: '🇸🇪 瑞典节点', pattern: /🇸🇪|瑞典|Sweden|Stockholm|斯德哥尔摩|\bSE\b/i },
    { name: '🇷🇴 罗马尼亚节点', pattern: /🇷🇴|罗马尼亚|羅馬尼亞|Romania|Bucharest|布加勒斯特|\bRO\b/i },
    { name: '🇲🇩 摩尔多瓦节点', pattern: /🇲🇩|摩尔多瓦|摩爾多瓦|Moldova|Chisinau|Chișinău|基希讷乌|\bMD\b/i },
    { name: '🇵🇱 波兰节点', pattern: /🇵🇱|波兰|波蘭|Poland|Warsaw|华沙|\bPL\b/i },
    { name: '🇪🇸 西班牙节点', pattern: /🇪🇸|西班牙|Spain|Madrid|Barcelona|马德里|巴塞罗那|\bES\b/i },
    { name: '🇵🇹 葡萄牙节点', pattern: /🇵🇹|葡萄牙|Portugal|Lisbon|里斯本|\bPT\b/i },
    { name: '🇨🇭 瑞士节点', pattern: /🇨🇭|瑞士|Switzerland|Zurich|Zürich|Geneva|苏黎世|日内瓦|\bCH\b/i },
    { name: '🇦🇹 奥地利节点', pattern: /🇦🇹|奥地利|奧地利|Austria|Vienna|维也纳|\bAT\b/i },
    { name: '🇨🇿 捷克节点', pattern: /🇨🇿|捷克|Czech|Prague|布拉格|\bCZ\b/i },
    { name: '🇫🇮 芬兰节点', pattern: /🇫🇮|芬兰|芬蘭|Finland|Helsinki|赫尔辛基|\bFI\b/i },
    { name: '🇩🇰 丹麦节点', pattern: /🇩🇰|丹麦|丹麥|Denmark|Copenhagen|哥本哈根|\bDK\b/i },
    { name: '🇳🇴 挪威节点', pattern: /🇳🇴|挪威|Norway|Oslo|奥斯陆|\bNO\b/i },
    { name: '🇧🇪 比利时节点', pattern: /🇧🇪|比利时|比利時|Belgium|Brussels|布鲁塞尔|\bBE\b/i },
    { name: '🇱🇺 卢森堡节点', pattern: /🇱🇺|卢森堡|盧森堡|Luxembourg|\bLU\b/i },
    { name: '🇮🇪 爱尔兰节点', pattern: /🇮🇪|爱尔兰|愛爾蘭|Ireland|Dublin|都柏林|\bIE\b/i },
    { name: '🇺🇦 乌克兰节点', pattern: /🇺🇦|乌克兰|烏克蘭|Ukraine|Kyiv|Kiev|基辅|\bUA\b/i },
    { name: '🇭🇺 匈牙利节点', pattern: /🇭🇺|匈牙利|Hungary|Budapest|布达佩斯|\bHU\b/i },
    { name: '🇧🇬 保加利亚节点', pattern: /🇧🇬|保加利亚|保加利亞|Bulgaria|Sofia|索菲亚|\bBG\b/i },
    { name: '🇬🇷 希腊节点', pattern: /🇬🇷|希腊|希臘|Greece|Athens|雅典|\bGR\b/i },
    { name: '🇷🇸 塞尔维亚节点', pattern: /🇷🇸|塞尔维亚|塞爾維亞|Serbia|Belgrade|贝尔格莱德|\bRS\b/i },
    { name: '🇭🇷 克罗地亚节点', pattern: /🇭🇷|克罗地亚|克羅地亞|Croatia|Zagreb|萨格勒布|\bHR\b/i },
    { name: '🇸🇰 斯洛伐克节点', pattern: /🇸🇰|斯洛伐克|Slovakia|Bratislava|布拉迪斯拉发|\bSK\b/i },
    { name: '🇸🇮 斯洛文尼亚节点', pattern: /🇸🇮|斯洛文尼亚|斯洛文尼亞|Slovenia|Ljubljana|卢布尔雅那|\bSI\b/i },
    { name: '🇱🇹 立陶宛节点', pattern: /🇱🇹|立陶宛|Lithuania|Vilnius|维尔纽斯|\bLT\b/i },
    { name: '🇱🇻 拉脱维亚节点', pattern: /🇱🇻|拉脱维亚|拉脫維亞|Latvia|Riga|里加|\bLV\b/i },
    { name: '🇪🇪 爱沙尼亚节点', pattern: /🇪🇪|爱沙尼亚|愛沙尼亞|Estonia|Tallinn|塔林|\bEE\b/i },
    { name: '🇰🇷 韩国节点', pattern: /🇰🇷|韩国|韓國|Korea|Seoul|首尔|首爾|\bKR\b/i },
    { name: '🇮🇳 印度节点', pattern: /🇮🇳|印度|India|Mumbai|Delhi|孟买|德里|\bIN\b/i },
    { name: '🇧🇷 巴西节点', pattern: /🇧🇷|巴西|Brazil|Sao\s*Paulo|São\s*Paulo|圣保罗|\bBR\b/i },
    { name: '🇦🇷 阿根廷节点', pattern: /🇦🇷|阿根廷|Argentina|Buenos\s*Aires|布宜诺斯艾利斯|\bAR\b/i },
    { name: '🇦🇺 澳大利亚节点', pattern: /🇦🇺|澳大利亚|澳洲|Australia|Sydney|Melbourne|悉尼|墨尔本|\bAU\b/i },
    { name: '🇨🇦 加拿大节点', pattern: /🇨🇦|加拿大|Canada|Toronto|Vancouver|多伦多|温哥华|\bCA\b/i },
];

const AUTO_REGION_GROUP_NAMES = AUTO_REGION_GROUPS.map((region) => region.name);

const AUTO_REGION_INJECT_GROUPS = new Set([
    '👋 手动切换',
    '🚀 国外网站',
    'Telegram',
    '🤖 AI',
    '🎮 游戏服务',
    'Emby',
    'Spotify',
    '📚 E站',
    '🥵 不许涩涩',
    '🐟 漏网之鱼',
    '📦 大宗流量',
    '💻 环境仓库',
]);

/**
 * 去重并保留原始顺序，避免同名节点或重复策略项撑大策略组。
 *
 * @param {Array<string>} values 需要去重的字符串列表
 * @returns {Array<string>} 去重后的字符串列表
 */
function uniqueOrdered(values) {
    const seen = new Set();
    return values.filter((value) => {
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

/**
 * 根据节点名匹配地区定义，生成实际存在的地区节点映射。
 *
 * @param {Array<Record<string, any>>} proxies 订阅中的代理节点列表
 * @returns {Map<string, Array<string>>} 地区组名到节点名列表的映射
 */
function collectRegionNodes(proxies) {
    const result = new Map();

    for (const region of AUTO_REGION_GROUPS) {
        const names = uniqueOrdered(
            proxies
                .filter((proxy) => region.pattern.test(String(proxy?.name ?? '')))
                .map((proxy) => proxy.name)
                .filter(Boolean)
        );

        if (names.length > 0) {
            result.set(region.name, names);
        }
    }

    return result;
}

/**
 * 创建显式节点列表的 url-test 地区组，避免 include-all/filter 在客户端侧出现空组。
 *
 * @param {string} name 地区策略组名称
 * @param {Array<string>} proxies 该地区匹配到的节点名
 * @returns {Record<string, any>} mihomo 策略组对象
 */
function createRegionUrlTestGroup(name, proxies) {
    return {
        ...groupBase,
        name,
        type: 'url-test',
        proxies,
        tolerance: 5,
    };
}

/**
 * 将业务组里的固定地区占位替换为真实存在的地区组，同时清理不存在的地区引用。
 *
 * @param {Record<string, any>} group 策略组对象
 * @param {Array<string>} activeRegionNames 当前订阅实际生成出来的地区组名
 * @returns {Record<string, any>} 更新后的策略组对象
 */
function mergeActiveRegionsIntoGroup(group, activeRegionNames) {
    if (!AUTO_REGION_INJECT_GROUPS.has(group.name) || !Array.isArray(group.proxies)) {
        return group;
    }

    const withoutRegionPlaceholders = group.proxies.filter(
        (name) => !AUTO_REGION_GROUP_NAMES.includes(name)
    );
    const autoSelectIndex = withoutRegionPlaceholders.indexOf('⚡ 自动选择');
    const lowRateIndex = withoutRegionPlaceholders.indexOf('🏷️ 低倍率');
    const insertAt = autoSelectIndex >= 0 ? autoSelectIndex : lowRateIndex;
    const nextProxies = [...withoutRegionPlaceholders];
    nextProxies.splice(insertAt + 1, 0, ...activeRegionNames);

    return {
        ...group,
        proxies: uniqueOrdered(nextProxies),
    };
}

/**
 * 按订阅节点动态生成地区 url-test 组，并把业务组同步到实际存在的地区。
 *
 * @param {Record<string, any>} config Clash 配置对象
 * @returns {Record<string, any>} 已应用自动地区组的 Clash 配置对象
 */
function applyAutoRegionGroups(config) {
    if (!Array.isArray(config.proxies) || !Array.isArray(config['proxy-groups'])) {
        return config;
    }

    const regionNodes = collectRegionNodes(config.proxies);
    const activeRegionNames = AUTO_REGION_GROUP_NAMES.filter((name) => regionNodes.has(name));
    const nonRegionGroups = config['proxy-groups'].filter(
        (group) => !AUTO_REGION_GROUP_NAMES.includes(group.name)
    );

    const mergedGroups = nonRegionGroups.map((group) =>
        mergeActiveRegionsIntoGroup(group, activeRegionNames)
    );
    const generatedRegionGroups = activeRegionNames.map((name) =>
        createRegionUrlTestGroup(name, regionNodes.get(name))
    );

    config['proxy-groups'] = [...mergedGroups, ...generatedRegionGroups];
    return config;
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
    const _excReg = new RegExp("(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)", 'i');
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
            "geosite:cn,private,apple": "https://dns.alidns.com/dns-query",
            "geosite:!cn,gfw": "https://posvdm.cloudflare-gateway.com/dns-query"
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

    // 覆盖策略组
    config['proxy-groups'] = [
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
                "🐔 小鸡节点",
                "🏷️ 低倍率",
                "🧊 冷门节点",
                "DIRECT"
            ],
            "include-all": true,
            "filter": "(?i)^(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联))).*"
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
                "🏷️ 低倍率",
                "🇭🇰 香港节点",
                "🇺🇲 美国节点",
                "🇸🇬 狮城节点",
                "🇯🇵 日本节点",
                "🇹🇼 台湾节点",
                "🧊 冷门节点",
                "👋 手动切换",
                "DIRECT"
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
                "🏷️ 低倍率",
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
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "⚡ 自动选择",
            "type": "url-test",
            "include-all": true,
            "filter": "(?i)^(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?=.*(🇭🇰|香港|HK|Hong\\s*Kong|🇺🇲|🇺🇸|美国|US|United.?States|洛杉矶|圣何塞|🇸🇬|新加坡|狮城|SG|Singapore|🇯🇵|日本|东京|JP|Japan|🇹🇼|台湾|TW|Tai|Taiwan))(?!.*(实验|低倍率|小鸡|chicken|vps|剩余|Expire|Traffic|GB|官网|网址|官址|套餐|应急|失联|重置|到期|过期|订阅)).*",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "https://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🏷️ 低倍率",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)(实验|低倍率|低倍|0\\.[1-9]\\s*(?:x|倍)?|[1-5]折)",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🐔 小鸡节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)chicken|vps|server|小鸡|鸡",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🇭🇰 香港节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)🇭🇰|香港|HK|Hong\\s*Kong",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🇺🇲 美国节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)🇺🇲|🇺🇸|美国|US|United.?States|洛杉矶|圣何塞",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🇸🇬 狮城节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)🇸🇬|新加坡|狮城|SG|Singapore",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🇪🇺 欧洲节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)🇪🇺|欧洲|Europe|🇩🇪|德国|Germany|Frankfurt|法兰克福|Berlin|柏林|🇳🇱|荷兰|Netherlands|Amsterdam|阿姆斯特丹|🇬🇧|英国|United.?Kingdom|London|伦敦|🇫🇷|法国|France|Paris|巴黎|🇮🇪|爱尔兰|Ireland|Dublin|都柏林",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🇹🇷 土耳其节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)🇹🇷|土耳其|TR|Turkey|Turkiye|Türkiye|Istanbul",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🇯🇵 日本节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)🇯🇵|日本|东京|JP|Japan",
            "tolerance": 5
        },
        {
            "interval": 300,
            "url": "http://www.gstatic.com/generate_204",
            "max-failed-times": 3,
            "name": "🇹🇼 台湾节点",
            "type": "url-test",
            "include-all": true,
            "filter": "(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?i)🇹🇼|台湾|TW|Taiwan|Tai",
            "tolerance": 5
        },
        {
            "name": "🧊 冷门节点",
            "type": "select",
            "include-all": true,
            "filter": "(?i)^(?!.*(?:(?:\\d+(\\.\\d*)?\\s*GB|traffic|expire|premium|github|isp|流量|官网|网址|官址|机场|套餐|应急|时间|重置|剩余|[到过]期|订阅|失联)))(?!.*(🇭🇰|香港|HK|Hong|🇺🇸|🇺🇲|美国|洛杉矶|圣何塞|US|United.?States|🇸🇬|新加坡|狮|SG|Singapore|🇯🇵|日本|东京|JP|Japan|🇹🇼|台湾|TW|Tai|Taiwan|剩余|Expire|Traffic|GB)).*"
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
    applyAutoRegionGroups(config);

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
            "behavior": "classical",
            "format": "text",
            "url": "https://ruleset.skk.moe/Clash/non_ip/apple_cdn.txt",
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
