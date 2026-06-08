# sounfury-Clash_rules

自用 Clash 分流规则仓库。以 `source.yaml` 为唯一数据源，由 GitHub Action 自动生成各客户端产物。

---

## 各客户端使用方式

### subconverter（Clash / Mihomo / Clash Verge 等）

将以下地址作为 subconverter 后端的 **远程配置（config）** 参数：

```
https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/output/subconverter/main.ini
```

### mihomo-party 覆写脚本

在 mihomo-party「覆写」页面导入以下 JS 脚本地址：

```
https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/output/party/override.js
```

### Stash 覆写（.stoverride）

在 Stash「覆写」设置中添加以下地址：

```
https://raw.githubusercontent.com/sounfury/sounfury-Clash_rules/main/output/stash/override.stoverride
```

---

## 维护

只需编辑 `source.yaml` 或 `rule/*.list`，推送后 GitHub Action 自动更新以上三个产物。
