const ruleProviderCommon = {
    "type": "http",
    "format": "text",
    "interval": 86400
};

// 策略组通用配置
const groupBaseOption = {
    "interval": 300,
    "url": "http://1.1.1.1/generate_204",
    "max-failed-times": 3,
};

/**
 * 根据订阅配置生成统一的 Clash 策略组、规则集和基础运行参数。
 * 这里会顺带补齐按名称筛选的节点分组，保证不同入口生成结果尽量一致。
 *
 * @param {Record<string, any>} config 原始 Clash 配置对象
 * @returns {Record<string, any>} 修改后的 Clash 配置对象
 */
function main(config) {
    const proxyCount = config?.proxies?.length ?? 0;
    const proxyProviderCount =
        typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;
    if (proxyCount === 0 && proxyProviderCount === 0) {
        throw new Error("配置文件中未找到任何代理");
    }

    // 覆盖通用配置
    config["mixed-port"] = "7890";
    config["tcp-concurrent"] = true;
    config["allow-lan"] = true;
    config["ipv6"] = false;
    config["log-level"] = "info";
    config["unified-delay"] = "true";
    config["find-process-mode"] = "strict";
    config["global-client-fingerprint"] = "chrome";

    // 覆盖 dns 配置
    config["dns"] = {
        "enable": true,
        "listen": "0.0.0.0:1053",
        "ipv6": false,
        "enhanced-mode": "fake-ip",
        "fake-ip-range": "198.18.0.1/16",
        "fake-ip-filter": ["*", "+.lan", "+.local", "+.direct", "+.msftconnecttest.com", "+.msftncsi.com"],
        "nameserver": ["223.5.5.5", "119.29.29.29"]
    };

    // 覆盖 geodata 配置
    config["geodata-mode"] = true;
    config["geox-url"] = {
        "geoip": "https://mirror.ghproxy.com/https://raw.githubusercontent.com/Loyalsoldier/geoip/release/geoip.dat",
        "geosite": "https://mirror.ghproxy.com/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
        "mmdb": "https://mirror.ghproxy.com/https://raw.githubusercontent.com/Loyalsoldier/geoip/release/Country.mmdb",
        "asn": "https://mirror.ghproxy.com/https://raw.githubusercontent.com/Loyalsoldier/geoip/release/GeoLite2-ASN.mmdb"
    };

    // 覆盖 sniffer 配置
    config["sniffer"] = {
        "enable": true,
        "parse-pure-ip": true,
        "sniff": {
            "TLS": {
                "ports": ["443", "8443"]
            },
            "HTTP": {
                "ports": ["80", "8080-8880"],
                "override-destination": true
            },
            "QUIC": {
                "ports": ["443", "8443"]
            }
        }
    };

    // 覆盖 tun 配置
    config["tun"] = {
        "enable": true,
        "stack": "mixed",
        "dns-hijack": ["any:53"]
    };

    // 覆盖策略组
    config["proxy-groups"] = [
        {
            ...groupBaseOption,
            "name": "手动切换",
            "type": "select",
            "proxies": ["小鸡节点", "冷门节点", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "include-all": true,
            "icon": "https://github.com/shindgewongxj/WHATSINStash/raw/main/icon/applesafari.png"
        },
        {
            ...groupBaseOption,
            "name": "国外网站",
            "type": "select",
            "proxies": ["小鸡节点", "冷门节点", "手动切换", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Global.png"
        },



        {
            ...groupBaseOption,
            "name": "谷歌服务",
            "type": "select",
            "proxies": ["冷门节点", "手动切换", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Google_Search.png"
        },
        {
            ...groupBaseOption,
            "name": "AI",
            "type": "select",
            "proxies": ["小鸡节点", "冷门节点", "手动切换", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://raw.githubusercontent.com/Orz-3/mini/master/Color/OpenAI.png"
        },
        {
            ...groupBaseOption,
            "name": "游戏平台",
            "type": "select",
            "proxies": ["小鸡节点", "冷门节点", "手动切换", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Game.png"
        },
        {
            ...groupBaseOption,
            "name": "Emby",
            "type": "select",
            "include-all": true,
            "proxies": ["冷门节点", "手动切换", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Emby.png"
        },
        {
            ...groupBaseOption,
            "name": "Spotify",
            "type": "select",
            "proxies": ["美国节点", "冷门节点", "手动切换", "香港节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Spotify.png"
        },
        {
            ...groupBaseOption,
            "name": "小鸡节点",
            "type": "url-test",
            "tolerance": 0,
            "include-all": true,
            "filter": "(?i)chicken|vps|server|小鸡|鸡",
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Available.png"
        },
        {
            ...groupBaseOption,
            "name": "不许涩涩",
            "type": "select",
            "proxies": ["冷门节点", "手动切换", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Reject.png"
        },
        {
            ...groupBaseOption,
            "name": "漏网之鱼",
            "type": "select",
            "proxies": ["冷门节点", "手动切换", "香港节点", "美国节点", "狮城节点", "日本节点", "台湾节点", "DIRECT"],
            "icon": "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/fish.svg"
        },
        // 地区分组，默认自动选择
        {
            ...groupBaseOption,
            "name": "香港节点",
            "type": "url-test",
            "tolerance": 0,
            "include-all": true,
            "filter": "(?i)🇭🇰|香港|(\b(HK|Hong)\b)",
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Hong_Kong.png"
        },
        {
            ...groupBaseOption,
            "name": "美国节点",
            "type": "url-test",
            "tolerance": 0,
            "include-all": true,
            "filter": "(?i)🇺🇸|美国|洛杉矶|圣何塞|(\b(US|United States)\b)",
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/United_States.png"
        },
        {
            ...groupBaseOption,
            "name": "狮城节点",
            "type": "url-test",
            "tolerance": 0,
            "include-all": true,
            "filter": "(?i)🇸🇬|新加坡|狮|(\b(SG|Singapore)\b)",
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Singapore.png"
        },
        {
            ...groupBaseOption,
            "name": "日本节点",
            "type": "url-test",
            "tolerance": 0,
            "include-all": true,
            "filter": "(?i)🇯🇵|日本|东京|(\b(JP|Japan)\b)",
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Japan.png"
        },
        {
            ...groupBaseOption,
            "name": "台湾节点",
            "type": "url-test",
            "tolerance": 0,
            "include-all": true,
            "filter": "(?i)🇨🇳|🇹🇼|台湾|(\b(TW|Tai|Taiwan)\b)",
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/China.png"
        },
        {
            ...groupBaseOption,
            "name": "冷门节点",
            "type": "select",
            "include-all": true,
            "filter": "^(?!.*(🇭🇰|香港|HK|Hong|🇺🇸|美国|洛杉矶|圣何塞|US|United States|🇸🇬|新加坡|狮|SG|Singapore|🇯🇵|日本|东京|JP|Japan|🇨🇳|🇹🇼|台湾|TW|Tai|Taiwan|剩余|Expire|Traffic|GB)).*",
            "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Available.png"
        }
    ];

    // 覆盖规则集
    config["rule-providers"] = {
        "AD": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Reject.list",
            "path": "./rules/AD.list"
        },
        "Apple": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Apple.list",
            "path": "./rules/Apple.list"
        },
        "Google": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Google.list",
            "path": "./rules/Google.list"
        },
        "YouTube": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/YouTube.list",
            "path": "./rules/YouTube.list"
        },
        "Telegram": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Telegram.list",
            "path": "./rules/Telegram.list"
        },
        "Steam": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Steam.list",
            "path": "./rules/Steam.list"
        },
        "AI": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/refs/heads/main/list/ai.list",
            "path": "./rules/AI.list"
        },
        "Emby": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/list/Emby.list",
            "path": "./rules/Emby.list"
        },
        "Spotify": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/list/Spotify.list",
            "path": "./rules/Spotify.list"
        },
        "PrimeVideo": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/PrimeVideo.list",
            "path": "./rules/PrimeVideo.list"
        },
        "HBO": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/HBO.list",
            "path": "./rules/HBO.list"
        },
        "Github": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Github.list",
            "path": "./rules/Github.list"
        },
        "Microsoft": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Microsoft.list",
            "path": "./rules/Microsoft.list"
        },
        "Lan": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/Lan.list",
            "path": "./rules/Lan.list"
        },
        "ProxyGFW": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://github.com/Repcz/Tool/raw/X/Clash/Rules/ProxyGFW.list",
            "path": "./rules/ProxyGFW.list"
        },
        "Direct": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/list/direct.list",
            "path": "./rules/Direct.list"
        },
        "CN": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list",
            "path": "./rules/CN.list"
        },
        "CNCompanyIp": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list",
            "path": "./rules/CNCompanyIp.list"
        },
        "Donwload": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list",
            "path": "./rules/Download.list"
        },
        "proxy": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/list/proxy.list",
            "path": "./rules/proxy.list"
        },
        "sexy": {
            ...ruleProviderCommon,
            "behavior": "classical",
            "url": "https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/list/sexy.list",
            "path": "./rules/sexy.list"
        }


    };

    // 覆盖规则
    config["rules"] = [
        "RULE-SET,AD,REJECT",
        "RULE-SET,Direct,DIRECT",
        "RULE-SET,AI,AI",
        "RULE-SET,proxy,国外网站",
        "RULE-SET,Apple,国外网站",
        "RULE-SET,YouTube,谷歌服务",
        "RULE-SET,Google,谷歌服务",
        "RULE-SET,Telegram,国外网站",
        "RULE-SET,Steam,游戏平台",
        "RULE-SET,Emby,Emby",
        "RULE-SET,Spotify,Spotify",
        "RULE-SET,sexy,不许涩涩",
        "RULE-SET,PrimeVideo,国外网站",
        "RULE-SET,HBO,国外网站",
        "GEOSITE,github,国外网站",
        "GEOSITE,microsoft,国外网站",
        "GEOSITE,gfw,国外网站",
        "GEOIP,private,DIRECT",
        "GEOIP,cn,DIRECT",
        "RULE-SET,CN,DIRECT",
        "RULE-SET,CNCompanyIp,DIRECT",
        "RULE-SET,Donwload,DIRECT",
        "MATCH,漏网之鱼"
    ];

    // 返回修改后的配置
    return config;
}
