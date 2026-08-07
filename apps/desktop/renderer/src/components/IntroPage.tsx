const problems = [
  ['收藏会自然膨胀', '没有规则时，收藏很容易变成“先存下来再说”。清理只能靠印象，硬盘报警往往才是第一次真正介入。'],
  ['空间成本会持续增加', 'NAS 容量看起来很大，但高质量影片会快速吞掉空间。只靠扩容，维护成本会越来越高。'],
  ['Emby 不负责治理', 'Emby 适合识别与播放，但它不会判断某个演员是否超限，也不会告诉你哪个分类需要收缩。'],
] as const;

const mechanisms = [
  ['01', '用分类替代模糊喜好', '每个演员归入明确分类，每个分类设置影片上限。核心收藏可以更宽松，边缘兴趣不再无限增长。'],
  ['02', '用风险状态暴露失控点', '当数量接近或超过上限，JATLAS 会把压力变成可见队列。你不需要靠记忆判断哪里该整理。'],
  ['03', '和 Emby 对账', 'Emby 提供人物 ID 和影片数量，JATLAS 把这些事实写入台账，再根据规则给出治理判断。'],
  ['04', '扫描 NAS 路径', '为分类绑定存储目录后，可以扫描演员文件夹，把已有收藏逐步纳入台账，而不是从零手动录入。'],
  ['05', '用日志理解变化', '创建、导入、补全、刷新和失败都会进入右侧日志。长期来看，日志比一次性清理更重要。'],
] as const;

const setupSteps = [
  ['配置', '选择 SQLite 数据库文件，填写 Emby 服务地址和 API Key，创建分类，并设置每个分类的存储目录和影片上限。'],
  ['进入资产', '查看总体看板和分类卡片。日常不从全局演员大列表开始，而是先选择要管理的分类。'],
  ['管理分类', '在分类内扫描文件夹、导入演员、补全 Emby ID、刷新影片数量，并维护这个分类下的演员列表。'],
  ['查看日志', '右侧操作日志会保留任务进度和失败原因。修正目录、Emby 配置或演员信息后，再对失败项重试。'],
] as const;

export function IntroPage() {
  return (
    <div className="intro-terminal">
      <div className="intro-bootline">&gt; 正在加载本地资产治理协议...</div>
      <section className="intro-hero">
        <div>
          <h2>让不断膨胀的收藏重新可控</h2>
          <p>JATLAS 是面向 NAS + Emby 本地收藏结构的资产台账。它帮你在文件越存越多、Emby 条目和真实文件逐渐脱节时，把收藏重新纳入可查、可控、可维护的状态。</p>
        </div>
        <div className="intro-status-list" aria-label="产品边界">
          <span>[本地优先] SQLite 数据保存在本机</span>
          <span>[治理层] 不替代 NAS，也不替代 Emby</span>
          <span>[隐私场景] 不提供账号体系</span>
          <span>[项目边界] 不提供内容下载或公开分发</span>
        </div>
      </section>
      <section className="intro-terminal-section">
        <h3>&gt; cat ./问题来源</h3>
        <div className="intro-problem-grid">{problems.map(([title, body]) => <article key={title}><strong>{title}</strong><p>{body}</p></article>)}</div>
      </section>
      <section className="intro-terminal-section">
        <h3>&gt; ls ./治理机制</h3>
        <div className="intro-module-list">{mechanisms.map(([number, title, body]) => <article key={number}><span>{number}</span><div><strong>{title}</strong><p>{body}</p></div></article>)}</div>
      </section>
      <section className="intro-terminal-section">
        <h3>&gt; ./开始使用 --路径</h3>
        <ol className="intro-flow">{setupSteps.map(([title, body]) => <li key={title}><span>{title}</span><p>{body}</p></li>)}</ol>
      </section>
      <section className="intro-terminal-section intro-boundary">
        <h3>&gt; cat ./项目边界</h3>
        <p>JATLAS 是私人资产工作台，不是媒体播放器，也不是公开服务。它只帮助已经使用 NAS + Emby 管理本地收藏的人，把影片资产重新纳入可理解、可控制、可持续维护的状态。</p>
      </section>
    </div>
  );
}
