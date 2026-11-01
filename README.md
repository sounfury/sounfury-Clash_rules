# sounfury-Clash_rules

自用 Clash 分流规则仓库。分流配置写在 `routing.yaml`，由 3x-ui 和节点合并后下发给 Party、Stash 等客户端，客户端不需要覆写。

## 使用方式

在 3x-ui 的 Clash 订阅设置里：

1. 开启自定义路由，路由来源填：

   ```
   https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/routing.yaml
   ```

2. 开启 `subClashRemoteDNS`，`dns` 和 `sniffer` 才会下发（需要 3x-ui v3.11.0 及以上）。

客户端直接订阅 3x-ui 的地址即可。

## 维护

手工编辑 `routing.yaml` 或 `rule/*.list`，推送后生效，没有生成步骤。

- 3x-ui 对 `routing.yaml` 有约 10 分钟缓存，客户端更新订阅后才会拿到新配置。
- `hosts`、`tun` 和通用参数不会下发，这些设置留在客户端。
- 分组按节点名前缀筛选：`[🌸]` 主订阅，`[H]` 辅订阅，`🗄️` 自建小鸡。
