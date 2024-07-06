function FindProxyForURL(url, host) {

  // 定义两个数组，分别存储想要匹配子域名和不想匹配子域名的域名
  var direct_domains_with_subdomains = ["xboxlive.cn"];
  var direct_domains_without_subdomains = ["e-hentai.org", "exhentai.org"];
  //判断逻辑
  
  for (var i = 0; i < direct_domains_with_subdomains.length; i++) {
    if (dnsDomainIs(host, direct_domains_with_subdomains[i])) {
      return "DIRECT";
    }
  }
  for (var i = 0; i < direct_domains_without_subdomains.length; i++) {
    if (host == direct_domains_without_subdomains[i]) {
      return "DIRECT";
    }
  }

  return "PROXY 127.0.0.1:%mixed-port%; SOCKS5 127.0.0.1:%mixed-port%; DIRECT;"
}
