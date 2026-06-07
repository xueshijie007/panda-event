import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api } from './api/client';
import { ChartPanel } from './components/ChartPanel';
import { HistoryOrdersTable } from './components/HistoryOrdersTable';
import { OpenOrdersTable } from './components/OpenOrdersTable';
import { OrderPanel } from './components/OrderPanel';
import { StatsPanel } from './components/StatsPanel';
import { translations, type Language } from './i18n';
import type { ChartInterval, ContractInterval, ContractOrder, ContractStats, Kline, OpenContractPayload, RegisterPayload, SymbolName, Ticker, User } from './types';
import { formatMoney } from './utils';
import './styles.css';

type PageKey = 'home' | 'fund' | 'rebate' | 'weekly' | 'teaching' | 'simulator' | 'login' | 'register' | 'admin' | 'records' | 'feedback';

interface NavPage {
  key: PageKey;
  path: string;
  label: string;
  shortLabel?: string;
}

const navPages: NavPage[] = [
  { key: 'home', path: '/', label: '首页' },
  { key: 'login', path: '/login', label: '登录' },
  { key: 'register', path: '/register', label: '注册' },
  { key: 'admin', path: '/admin', label: '管理后台', shortLabel: '后台' },
  { key: 'rebate', path: '/rebate', label: '返佣链接' },
  { key: 'simulator', path: '/simulator', label: '事件模拟盘', shortLabel: '模拟盘' },
  { key: 'teaching', path: '/teaching', label: '事件合约教学', shortLabel: '教学' },
  { key: 'fund', path: '/fund', label: '熊猫基金' },
  { key: 'weekly', path: '/weekly', label: '每周活动' },
  { key: 'records', path: '/records', label: '直播战绩' },
  { key: 'feedback', path: '/feedback', label: '意见反馈' },
];

const pageByPath = new Map(navPages.map(page => [page.path, page]));

const featureCards = [
  { badge: '01', title: '注册熊猫社区账户', text: '填写账户、密码、微信/QQ 和交易所 UID，建立活动与返佣识别身份。', target: 'register' as PageKey },
  { badge: '02', title: '领取交易所返佣', text: 'WEEX、Gate、Deepcoin、TurboFlow 注册链接、邀请码和返佣比例集中展示。', target: 'rebate' as PageKey },
  { badge: '03', title: '进入事件模拟盘', text: '用 10,000 虚拟 USDT 练习 BTC/ETH 事件合约，先练规则再实盘。', target: 'simulator' as PageKey },
  { badge: '04', title: '学习做单框架', text: '学习周期、方向、入场条件、仓位控制和复盘模板，降低盲目下单。', target: 'teaching' as PageKey },
];

const secondaryCards = [
  { badge: '活动', title: '熊猫基金', text: '奖池、排名赛、直播 PVP 与每日连胜王。', target: 'fund' as PageKey },
  { badge: '周更', title: '每周活动', text: '本周活动安排、参与条件和奖励说明。', target: 'weekly' as PageKey },
  { badge: '复盘', title: '直播战绩', text: '直播开仓记录、胜率统计和复盘结论。', target: 'records' as PageKey },
  { badge: '反馈', title: '意见反馈', text: '提交 Bug、功能建议或活动建议。', target: 'feedback' as PageKey },
];

const rebatePlatforms = [
  {
    name: 'TurboFlow',
    title: 'TurboFlow 返佣',
    badge: '主推平台',
    summary: '事件总交易量 0.6% · 永续 60%',
    inviteCode: '联系小助理获取',
    rebate: '事件总交易量 0.6% / 永续 60%',
    href: '#',
  },
  {
    name: 'WEEX',
    title: 'WEEX 返佣',
    badge: '事件合约',
    summary: '邀请码bpzr · 返佣比例40%',
    inviteCode: 'bpzr',
    rebate: '40%',
    href: 'https://weasexx.online/zh-CN/register?vipCode=bpzr',
  },
  {
    name: 'Gate',
    title: 'Gate 返佣',
    badge: '主流平台',
    summary: '邀请码待VQCWVFWKAQ · 返佣比例待20%',
    inviteCode: 'VQCWVFWKAQ',
    rebate: '20%',
    href: 'https://www.gatewebsite.net/share/VQCWVFWKAQ',
  },
  {
    name: 'Deepcoin',
    title: 'Deepcoin 返佣',
    badge: '合约平台',
    summary: '邀请码9565847 · 返佣比例40%',
    inviteCode: '9565847',
    rebate: '40%',
    href: 'https://s.xdcjoin.com/9565847',
  },
];

const detailPages: Record<Exclude<PageKey, 'home' | 'simulator' | 'login' | 'register' | 'admin'>, {
  eyebrow: string;
  title: string;
  intro: string;
  stats: string[];
  sections: { title: string; text: string; items: string[] }[];
}> = {
  fund: {
    eyebrow: 'Reward Pool',
    title: '熊猫基金活动中心',
    intro: '集中展示基金活动规则、奖池进度、排名条件和直播对战说明，方便用户快速确认自己该参加哪一类活动。',
    stats: ['总奖池 2000U', '排名赛 / PVP / 连胜王', '周维度更新'],
    sections: [
      { title: '排名赛', text: '按活动周期内的有效交易表现计算排名，页面后续可以接入真实榜单数据。', items: ['展示活动时间', '展示奖池分配', '展示报名入口'] },
      { title: '直播 PVP', text: '用于直播间互动挑战，后续可沉淀对局记录和胜负统计。', items: ['主播开局说明', '用户参与规则', '结果复盘'] },
      { title: '每日连胜王', text: '记录每日连续盈利表现，适合做短周期用户激励。', items: ['每日重置', '连胜次数', '奖励发放说明'] },
    ],
  },
  rebate: {
    eyebrow: 'Referral',
    title: '返佣链接与开户链接',
    intro: '把不同平台注册链接、邀请码、返佣比例和新手操作说明放到一个页面，降低用户找入口的成本。',
    stats: ['开户链接汇总', '邀请码展示', '新手流程说明'],
    sections: [
      { title: '开户注册', text: '每个平台独立卡片展示，避免用户把链接和邀请码搞混。', items: ['注册链接', '邀请码', '平台备注'] },
      { title: '返佣说明', text: '说明返佣比例、统计周期、到账方式和注意事项。', items: ['返佣比例', '统计口径', '到账时间'] },
      { title: '新手路径', text: '从注册、充值模拟说明、风险提醒到练习盘入口形成闭环。', items: ['开户注册', '查看教学', '进入模拟盘'] },
    ],
  },
  weekly: {
    eyebrow: 'Weekly Events',
    title: '熊猫每周活动预览',
    intro: '每周活动页负责发布活动时间、平台、交易要求、奖励规则和群内参与方式。',
    stats: ['每周更新', '活动规则', '奖励说明'],
    sections: [
      { title: '活动日历', text: '按日期展示活动，用户能快速知道本周重点。', items: ['开始时间', '截止时间', '参与平台'] },
      { title: '交易要求', text: '明确交易量、有效订单、报名条件，避免规则解释成本。', items: ['有效交易量', '报名门槛', '结算标准'] },
      { title: '群内公告', text: '同步 VIP 群、直播间和活动回执信息。', items: ['群号/入口', '公告截图位', '获奖名单'] },
    ],
  },
  teaching: {
    eyebrow: 'Education',
    title: '事件合约教学',
    intro: '教学页把入门知识、指标研究、做单技巧和复盘方法分层展示，适合持续扩展文章和视频。',
    stats: ['入门教程', '指标研究', '复盘模板'],
    sections: [
      { title: '基础入门', text: '解释事件合约周期、CALL/PUT、盈亏结构和常见误区。', items: ['合约规则', '周期选择', '风险控制'] },
      { title: '指标研究', text: '沉淀 MACD、均线、量能、关键 K 线等短线参考方法。', items: ['参数设置', '确认逻辑', '失效条件'] },
      { title: '做单纪律', text: '强调等待确认、控制仓位和复盘，不鼓励重仓追单。', items: ['进场条件', '止损限制', '复盘记录'] },
    ],
  },
  records: {
    eyebrow: 'Live Records',
    title: '事件合约直播实战战绩',
    intro: '直播战绩页用于记录开仓时间、方向、周期、结果和复盘结论，让内容更可信。',
    stats: ['开仓记录', '胜率统计', '复盘结论'],
    sections: [
      { title: '直播记录', text: '后续可以把每次直播的开仓记录结构化展示。', items: ['开仓时间', '交易对/方向', '结算结果'] },
      { title: '统计面板', text: '聚合胜率、盈亏、连续亏损等指标，和模拟盘统计保持一致。', items: ['总交易次数', '胜率', '最大回撤'] },
      { title: '复盘沉淀', text: '记录为什么进场、哪里失误、下一次如何避免。', items: ['进场理由', '错误类型', '改进动作'] },
    ],
  },
  feedback: {
    eyebrow: 'Feedback',
    title: '网站意见与功能提议',
    intro: '反馈页用于收集页面体验、功能需求、Bug 和活动建议，后续可接入表单提交接口。',
    stats: ['Bug 反馈', '功能提议', '活动建议'],
    sections: [
      { title: '页面体验', text: '收集导航、移动端、加载速度和可读性问题。', items: ['页面名称', '问题描述', '截图说明'] },
      { title: '功能需求', text: '记录用户希望新增的榜单、返佣、教学或模拟盘能力。', items: ['需求场景', '优先级', '预期效果'] },
      { title: '活动建议', text: '收集用户对奖励规则、活动形式和直播互动的建议。', items: ['活动类型', '奖励方式', '参与门槛'] },
    ],
  },
};

function getInitialLanguage(): Language {
  const stored = localStorage.getItem('sim_language');
  if (stored === 'zh' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function getPageFromLocation(): PageKey {
  return pageByPath.get(window.location.pathname)?.key ?? 'home';
}

function getPathForPage(key: PageKey): string {
  return navPages.find(page => page.key === key)?.path ?? '/';
}

function SiteNav({
  currentPage,
  onNavigate,
  user,
  isAdmin,
  onAdminLogout,
}: {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  user?: User | null;
  isAdmin?: boolean;
  onAdminLogout?: () => void;
}) {
  const visiblePages = navPages.filter(page => page.key !== 'admin' && page.key !== 'register' && page.key !== 'login');
  return (
    <header className="site-header">
      <button className="brand-mark" type="button" onClick={() => onNavigate('home')}>
        <span>PD</span>
        <strong>熊猫事件社区</strong>
      </button>
      <nav className="site-nav" aria-label="主导航">
        {visiblePages.map(page => (
          <button
            key={page.key}
            className={currentPage === page.key ? 'nav-link active' : 'nav-link'}
            type="button"
            onClick={() => onNavigate(page.key)}
          >
            {page.shortLabel ?? page.label}
          </button>
        ))}
      </nav>
      <div className="site-account">
        {isAdmin ? (
          <>
            <button className="account-button" type="button" onClick={() => onNavigate('admin')}>管理后台</button>
            <button className="account-link" type="button" onClick={onAdminLogout}>退出</button>
          </>
        ) : user ? (
          <>
            <span>{user.username}</span>
            <button className="account-button" type="button" onClick={() => onNavigate('simulator')}>进入账户</button>
          </>
        ) : (
          <>
            <button className="account-link" type="button" onClick={() => onNavigate('login')}>登录</button>
            <button className="account-button" type="button" onClick={() => onNavigate('register')}>注册</button>
          </>
        )}
      </div>
    </header>
  );
}

function HomePage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <>
      <section className="hero-panel">
        <div className="hero-main">
          <p className="eyebrow">Panda Event Community</p>
          <h1>熊猫事件合约社区</h1>
          <p className="hero-copy">一个围绕事件合约用户的入口：注册熊猫账户、领取交易所返佣、使用模拟盘练习，再参与社区活动。</p>
          <div className="hero-actions">
            <button className="primary-action hero-button" type="button" onClick={() => onNavigate('register')}>立即注册账户</button>
            <button className="ghost-button hero-ghost" type="button" onClick={() => onNavigate('rebate')}>查看返佣链接</button>
            <button className="ghost-button hero-ghost" type="button" onClick={() => onNavigate('simulator')}>进入模拟盘</button>
          </div>
          <div className="hero-steps" aria-label="推荐流程">
            <div><span>01</span><strong>注册账户</strong><p>绑定联系方式和交易所 UID</p></div>
            <div><span>02</span><strong>领取返佣</strong><p>查看平台链接与邀请码</p></div>
            <div><span>03</span><strong>模拟练习</strong><p>使用 10,000 虚拟 USDT</p></div>
            <div><span>04</span><strong>参与活动</strong><p>查看基金、周活动和战绩</p></div>
          </div>
        </div>
        <aside className="hero-side">
          <div className="side-card primary">
            <span>主推流程</span>
            <strong>注册账户 → 返佣绑定 → 模拟练习</strong>
          </div>
          <div className="side-card">
            <span>支持平台</span>
            <strong>WEEX / Gate / Deepcoin / TurboFlow</strong>
          </div>
          <div className="side-card">
            <span>小助理阿风</span>
            <strong>QQ 2821305247</strong>
          </div>
          <p>注册、下载、充值或返佣设置遇到问题，可以联系小助理协助处理。</p>
        </aside>
      </section>

      <section className="section-head">
        <p className="eyebrow">Recommended Flow</p>
        <h2>推荐使用路径</h2>
        <p className="muted">按这个顺序走，最不容易漏掉返佣、账户绑定和模拟练习。</p>
      </section>
      <div className="portal-grid">
        {featureCards.map(card => (
          <button className="portal-card" key={card.title} type="button" onClick={() => onNavigate(card.target)}>
            <span>{card.badge}</span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </button>
        ))}
      </div>

      <section className="home-split">
        <article className="home-panel">
          <p className="eyebrow">Why Register First</p>
          <h2>注册不是摆设，是为了把返佣、活动和模拟盘身份统一起来。</h2>
          <p>账户资料会记录联系方式和交易所 UID，后续活动排名、返佣资格核对、客服协助都会围绕这套身份进行。</p>
        </article>
        <article className="home-panel accent">
          <p className="eyebrow">Risk Note</p>
          <h2>模拟盘只做练习，不处理真实充值提现。</h2>
          <p>网站当前核心是教学、练习和信息聚合。真实交易、资金、钱包和平台账户都发生在交易所侧。</p>
        </article>
      </section>

      <section className="section-head compact-section">
        <p className="eyebrow">More</p>
        <h2>活动与复盘</h2>
      </section>
      <div className="secondary-grid">
        {secondaryCards.map(card => (
          <button className="secondary-card" key={card.title} type="button" onClick={() => onNavigate(card.target)}>
            <span>{card.badge}</span>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function DetailPage({ page }: { page: Exclude<PageKey, 'home' | 'simulator' | 'login' | 'register' | 'admin'> }) {
  const content = detailPages[page];
  return (
    <>
      <section className="page-hero">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        <div className="mini-stat-row">
          {content.stats.map(stat => <span key={stat}>{stat}</span>)}
        </div>
      </section>
      <div className="content-grid">
        {content.sections.map(section => (
          <article className="content-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
            <ul>
              {section.items.map(item => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}

function RebatePage() {
  return (
    <>
      <section className="rebate-hero">
        <div>
          <p className="eyebrow">Exchange Referral</p>
          <h1>事件合约 · 交易所注册返佣</h1>
          <p>WEEX、Gate、Deepcoin、TurboFlow 注册链接、邀请码与返佣比例说明。</p>
          <div className="mini-stat-row">
            <span>注册链接</span>
            <span>邀请码</span>
            <span>最高返佣比例</span>
          </div>
        </div>
        <aside className="rebate-help">
          <p className="eyebrow">事件合约返佣</p>
          <h2>注册链接 · 邀请码 · 最高返佣比例</h2>
          <strong>需要帮助可以联系小助理</strong>
          <p>注册、下载、充值或返佣设置遇到问题，都可以找小助理阿风协助处理。</p>
          <div className="assistant-line">
            <span>小助理阿风</span>
            <strong>QQ 2821305247</strong>
          </div>
        </aside>
      </section>

      <div className="rebate-grid">
        {rebatePlatforms.map(platform => (
          <article className={platform.name === 'TurboFlow' ? 'rebate-card featured' : 'rebate-card'} key={platform.name}>
            <div className="rebate-card-top">
              <span>{platform.badge}</span>
              <strong>{platform.name}</strong>
            </div>
            <h2>{platform.title}</h2>
            <p>{platform.summary}</p>
            <dl>
              <div>
                <dt>邀请码</dt>
                <dd>{platform.inviteCode}</dd>
              </div>
              <div>
                <dt>返佣比例</dt>
                <dd>{platform.rebate}</dd>
              </div>
            </dl>
            <a className="rebate-link" href={platform.href} target="_blank" rel="noreferrer">
              打开注册链接
            </a>
          </article>
        ))}
      </div>
    </>
  );
}

function AccountAccessCard({
  mode,
  username,
  password,
  registerData,
  error,
  languageSwitch,
  onUsernameChange,
  onPasswordChange,
  onRegisterDataChange,
  onSubmit,
  onNavigate,
}: {
  mode: 'login' | 'register';
  username: string;
  password: string;
  registerData: RegisterPayload;
  error: string | null;
  languageSwitch: ReactNode;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterDataChange: (payload: RegisterPayload) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onNavigate: (page: PageKey) => void;
}) {
  const isRegister = mode === 'register';
  const registerReady = username.trim()
    && password.trim().length >= 6
    && registerData.contact_account.trim()
    && registerData.exchange_uid.trim();
  const loginReady = username.trim() && password.trim().length >= 6;
  return (
    <section className={isRegister ? 'register-layout' : 'login-shell embedded-login'}>
      <form className="login-card register-card" onSubmit={onSubmit}>
        <div className="login-topline">
          <p className="eyebrow">{isRegister ? 'Create Account' : 'Account Login'}</p>
          {languageSwitch}
        </div>
        <h1>{isRegister ? '注册熊猫账户' : '登录熊猫账户'}</h1>
        <p className="muted">
          {isRegister
            ? '创建熊猫社区账户并绑定联系方式、交易所 UID。新账户默认获得 10,000 虚拟 USDT，仅用于模拟练习。'
            : '登录后回到首页，你可以继续查看返佣、教学、活动，或进入事件模拟盘练习。'}
        </p>
        <label className="field">
          <span>账户</span>
          <input value={username} onChange={event => onUsernameChange(event.target.value)} minLength={1} maxLength={64} placeholder="请输入账户" />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            value={password}
            onChange={event => onPasswordChange(event.target.value)}
            type="password"
            minLength={6}
            maxLength={128}
            placeholder="至少 6 位密码"
          />
        </label>
        {isRegister && (
          <>
            <label className="field">
              <span>联系方式类型</span>
              <select
                value={registerData.contact_type}
                onChange={event => onRegisterDataChange({ ...registerData, contact_type: event.target.value as RegisterPayload['contact_type'] })}
              >
                <option value="wechat">微信</option>
                <option value="qq">QQ</option>
              </select>
            </label>
            <label className="field">
              <span>{registerData.contact_type === 'wechat' ? '微信号' : 'QQ号'}</span>
              <input
                value={registerData.contact_account}
                onChange={event => onRegisterDataChange({ ...registerData, contact_account: event.target.value })}
                minLength={2}
                maxLength={128}
                placeholder={registerData.contact_type === 'wechat' ? '请输入微信号' : '请输入QQ号'}
              />
            </label>
            <label className="field">
              <span>熊猫社区旗下注册的交易所账号 UID</span>
              <input
                value={registerData.exchange_uid}
                onChange={event => onRegisterDataChange({ ...registerData, exchange_uid: event.target.value })}
                minLength={2}
                maxLength={128}
                placeholder="请输入交易所 UID"
              />
            </label>
            <p className="form-note">UID 用于核对社区活动和返佣资格；请填写通过熊猫社区链接注册的交易所账户 UID。</p>
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="primary-action" type="submit" disabled={isRegister ? !registerReady : !loginReady}>{isRegister ? '提交注册审核' : '登录熊猫账户'}</button>
        <button
          className="ghost-button account-alt-action"
          type="button"
          onClick={() => onNavigate(isRegister ? 'simulator' : 'register')}
        >
          {isRegister ? '已有账户，去登录' : '没有账户，去注册'}
        </button>
      </form>
      {isRegister && (
        <aside className="register-side">
          <p className="eyebrow">What You Get</p>
          <h2>注册后可直接练习</h2>
          <ul>
            <li>10,000 虚拟 USDT 初始余额</li>
            <li>BTCUSDT / ETHUSDT 模拟事件合约</li>
            <li>未结算订单、历史订单和胜率统计</li>
            <li>无真实充值、提现或真实交易风险</li>
          </ul>
        </aside>
      )}
    </section>
  );
}

function AdminPage({ onLogout }: { onLogout: () => void }) {
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') ?? '');
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers(nextFilter = statusFilter, nextToken = token) {
    if (!nextToken) return;
    setLoading(true);
    setAdminError(null);
    try {
      const nextUsers = await api.getAdminUsers(nextToken, nextFilter);
      setUsers(nextUsers);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '后台数据加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(event: FormEvent) {
    event.preventDefault();
    setAdminError(null);
    try {
      const response = await api.adminLogin(adminName, adminPassword);
      localStorage.setItem('admin_token', response.token);
      setToken(response.token);
      await loadUsers(statusFilter, response.token);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '后台登录失败');
    }
  }

  async function reviewUser(userId: number, action: 'approve' | 'reject') {
    setAdminError(null);
    try {
      if (action === 'approve') {
        await api.approveUser(token, userId);
      } else {
        await api.rejectUser(token, userId);
      }
      await loadUsers();
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : '审核操作失败');
    }
  }

  if (!token) {
    return (
      <section className="admin-shell">
        <form className="login-card" onSubmit={handleAdminLogin}>
          <p className="eyebrow">Admin</p>
          <h1>管理员后台</h1>
          <p className="muted">默认后台账户：admin / PandaAdmin123。正式使用建议通过环境变量修改。</p>
          <label className="field"><span>管理员账户</span><input value={adminName} onChange={event => setAdminName(event.target.value)} /></label>
          <label className="field"><span>管理员密码</span><input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} /></label>
          {adminError && <p className="form-error">{adminError}</p>}
          <button className="primary-action" type="submit">登录后台</button>
        </form>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="admin-top">
        <div>
          <p className="eyebrow">Admin Review</p>
          <h1>用户注册审核</h1>
          <p className="muted">这里可以查看用户提交的微信/QQ、交易所 UID，并决定是否允许登录模拟盘。</p>
        </div>
        <div className="admin-actions">
          <select value={statusFilter} onChange={event => {
            setStatusFilter(event.target.value);
            loadUsers(event.target.value);
          }}>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="all">全部</option>
          </select>
          <button className="ghost-button" type="button" onClick={() => loadUsers()}>刷新</button>
          <button className="ghost-button" type="button" onClick={() => {
            localStorage.removeItem('admin_token');
            setToken('');
            setUsers([]);
            onLogout();
          }}>退出后台</button>
        </div>
      </div>
      {adminError && <div className="error-banner"><span>{adminError}</span><button onClick={() => setAdminError(null)}>关闭</button></div>}
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>账户</th>
              <th>联系方式</th>
              <th>交易所 UID</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td className="empty-cell" colSpan={6}>{loading ? '加载中...' : '暂无用户'}</td></tr>}
            {users.map(item => (
              <tr key={item.id}>
                <td>{item.username}</td>
                <td>{item.contact_type === 'wechat' ? '微信' : 'QQ'} · {item.contact_account}</td>
                <td>{item.exchange_uid}</td>
                <td><span className={`review-badge ${item.review_status}`}>{item.review_status}</span></td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
                <td>
                  <div className="review-actions">
                    <button className="chip active" type="button" onClick={() => reviewUser(item.id, 'approve')}>通过</button>
                    <button className="chip danger" type="button" onClick={() => reviewUser(item.id, 'reject')}>拒绝</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SimulatorGate({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <section className="simulator-gate">
      <div>
        <p className="eyebrow">Simulator Access</p>
        <h1>请先登录熊猫账户</h1>
        <p>事件模拟盘需要登录后使用。注册申请通过审核后，即可使用 10,000 虚拟 USDT 练习 BTC/ETH 事件合约。</p>
        <div className="hero-actions">
          <button className="primary-action hero-button" type="button" onClick={() => onNavigate('login')}>登录账户</button>
          <button className="ghost-button hero-ghost" type="button" onClick={() => onNavigate('register')}>注册账户</button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>(getPageFromLocation);
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];
  const [user, setUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') ?? '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerData, setRegisterData] = useState<RegisterPayload>({
    username: '',
    password: '',
    contact_type: 'wechat',
    contact_account: '',
    exchange_uid: '',
  });
  const [symbol, setSymbol] = useState<SymbolName>('BTCUSDT');
  const [chartInterval, setChartInterval] = useState<ChartInterval>('5m');
  const [orderInterval, setOrderInterval] = useState<ContractInterval>('5m');
  const [klines, setKlines] = useState<Kline[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [openOrders, setOpenOrders] = useState<ContractOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<ContractOrder[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerNotice, setRegisterNotice] = useState<string | null>(null);
  const accountLoadedRef = useRef(false);

  function navigate(page: PageKey) {
    const path = getPathForPage(page);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    const onPopState = () => setCurrentPage(getPageFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem('sim_language', next);
  }

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    try {
      const [nextKlines, nextTicker] = await Promise.all([
        api.getKlines(symbol, chartInterval, 200),
        api.getTicker(symbol),
      ]);
      setKlines(nextKlines);
      setTicker(nextTicker);
    } catch (err) {
      setError(err instanceof Error ? err.message : translations[language].failedMarket);
    } finally {
      setMarketLoading(false);
    }
  }, [symbol, chartInterval, language]);

  useEffect(() => {
    setKlines([]);
    setTicker(null);
  }, [symbol, chartInterval]);

  const loadAccount = useCallback(async (userId: number) => {
    if (!accountLoadedRef.current) {
      setAccountLoading(true);
    }
    try {
      const [nextUser, nextOpen, nextHistory, nextStats] = await Promise.all([
        api.getMe(userId),
        api.getOpenOrders(userId),
        api.getHistory(userId),
        api.getStats(userId),
      ]);
      setUser(nextUser);
      setOpenOrders(nextOpen);
      setHistoryOrders(nextHistory);
      setStats(nextStats);
      accountLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : translations[language].failedAccount);
    } finally {
      setAccountLoading(false);
    }
  }, [language]);

  function clearAccountState() {
    setUser(null);
    setOpenOrders([]);
    setHistoryOrders([]);
    setStats(null);
    accountLoadedRef.current = false;
  }

  useEffect(() => {
    const storedUserId = localStorage.getItem('sim_user_id');
    if (!storedUserId) return;
    api.getMe(Number(storedUserId))
      .then(setUser)
      .catch(() => localStorage.removeItem('sim_user_id'));
  }, []);

  useEffect(() => {
    if (currentPage !== 'simulator') return;
    loadMarket();
    const timer = window.setInterval(loadMarket, 10_000);
    return () => window.clearInterval(timer);
  }, [currentPage, loadMarket]);

  useEffect(() => {
    if (!user || currentPage !== 'simulator') return;
    loadAccount(user.id);
    const timer = window.setInterval(() => loadAccount(user.id), 4_000);
    return () => window.clearInterval(timer);
  }, [user?.id, currentPage, loadAccount]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    clearAccountState();
    try {
      const nextUser = await api.login(username.trim(), password);
      localStorage.setItem('sim_user_id', String(nextUser.id));
      setUser(nextUser);
      await loadAccount(nextUser.id);
      navigate('home');
    } catch (err) {
      localStorage.removeItem('sim_user_id');
      try {
        const admin = await api.adminLogin(username.trim(), password);
        localStorage.setItem('admin_token', admin.token);
        setAdminToken(admin.token);
        setError(null);
        navigate('home');
      } catch {
        setError(err instanceof Error ? err.message : t.loginFailed);
      }
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError(null);
    clearAccountState();
    try {
      const nextUser = await api.register({
        ...registerData,
        username: username.trim(),
        password,
        contact_account: registerData.contact_account.trim(),
        exchange_uid: registerData.exchange_uid.trim(),
      });
      setRegisterNotice(`注册申请已提交，账户 ${nextUser.username} 正在等待管理员审核。审核通过后即可登录模拟盘。`);
    } catch (err) {
      localStorage.removeItem('sim_user_id');
      setError(err instanceof Error ? err.message : '注册失败');
    }
  }

  async function handleSubmitOrder(payload: OpenContractPayload) {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.openContract(user.id, payload);
      await loadAccount(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.orderFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetAccount() {
    if (!user) return;
    const confirmed = window.confirm('确认重置模拟盘资产？余额会恢复为 10,000 虚拟 USDT，并清空你的模拟订单记录。');
    if (!confirmed) return;
    setError(null);
    try {
      const nextUser = await api.resetAccount(user.id);
      setUser(nextUser);
      setOpenOrders([]);
      setHistoryOrders([]);
      setStats(null);
      await loadAccount(nextUser.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置资产失败');
    }
  }

  function logout() {
    localStorage.removeItem('sim_user_id');
    clearAccountState();
  }

  function adminLogout() {
    localStorage.removeItem('admin_token');
    setAdminToken('');
    navigate('home');
  }

  const languageSwitch = (
    <div className="language-switch" aria-label={t.language}>
      <button className={language === 'zh' ? 'chip active' : 'chip'} onClick={() => changeLanguage('zh')} type="button">中文</button>
      <button className={language === 'en' ? 'chip active' : 'chip'} onClick={() => changeLanguage('en')} type="button">EN</button>
    </div>
  );

  const marketingPage = useMemo(() => {
    if (currentPage === 'home') return <HomePage onNavigate={navigate} />;
    if (currentPage === 'rebate') return <RebatePage />;
    if (currentPage !== 'simulator' && currentPage !== 'login' && currentPage !== 'register' && currentPage !== 'admin') return <DetailPage page={currentPage} />;
    return null;
  }, [currentPage]);

  if (currentPage === 'admin') {
    return (
      <main className="site-shell simulator-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={null} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <AdminPage onLogout={adminLogout} />
      </main>
    );
  }

  if (currentPage === 'register') {
    return (
      <main className="site-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <AccountAccessCard
          mode="register"
          username={username}
          password={password}
          registerData={registerData}
          error={registerNotice ?? error}
          languageSwitch={languageSwitch}
          onUsernameChange={value => {
            setUsername(value);
            setRegisterData({ ...registerData, username: value });
          }}
          onPasswordChange={value => {
            setPassword(value);
            setRegisterData({ ...registerData, password: value });
          }}
          onRegisterDataChange={setRegisterData}
          onSubmit={handleRegister}
          onNavigate={navigate}
        />
        <footer className="site-footer">熊猫事件合约社区 · 专注事件合约教学 · 仅供学习交流</footer>
      </main>
    );
  }

  if (currentPage === 'login') {
    return (
      <main className="site-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <AccountAccessCard
          mode="login"
          username={username}
          password={password}
          registerData={registerData}
          error={error}
          languageSwitch={languageSwitch}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onRegisterDataChange={setRegisterData}
          onSubmit={handleLogin}
          onNavigate={navigate}
        />
        <footer className="site-footer">熊猫事件合约社区 · 专注事件合约教学 · 仅供学习交流</footer>
      </main>
    );
  }

  if (currentPage !== 'simulator') {
    return (
      <main className="site-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        {marketingPage}
        <footer className="site-footer">熊猫事件合约社区 · 专注事件合约教学 · 仅供学习交流</footer>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="site-shell simulator-shell">
        <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
        <SimulatorGate onNavigate={navigate} />
      </main>
    );
  }

  return (
    <main className="site-shell simulator-shell">
      <SiteNav currentPage={currentPage} onNavigate={navigate} user={user} isAdmin={Boolean(adminToken)} onAdminLogout={adminLogout} />
      <section className="app-shell">
        <nav className="top-nav">
          <div>
            <p className="eyebrow">{t.mvp}</p>
            <h1>{t.appName}</h1>
          </div>
          <div className="user-strip">
            {languageSwitch}
            <span>{user.username}</span>
            <strong>{formatMoney(Number(user.balance))} USDT</strong>
            <button className="ghost-button reset-button" onClick={handleResetAccount}>重置资产</button>
            <button className="ghost-button" onClick={logout}>{t.logout}</button>
          </div>
        </nav>

        {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError(null)}>{t.dismiss}</button></div>}

        <div className="main-grid">
          <ChartPanel
            symbol={symbol}
            interval={chartInterval}
            ticker={ticker}
            klines={klines}
            loading={marketLoading}
            t={t}
            onSymbolChange={setSymbol}
            onIntervalChange={(next) => {
              setChartInterval(next);
              if (next !== '1m') {
                setOrderInterval(next);
              }
            }}
          />
          <OrderPanel
            symbol={symbol}
            interval={orderInterval}
            balance={Number(user.balance)}
            submitting={submitting}
            language={language}
            t={t}
            onIntervalChange={setOrderInterval}
            onSubmit={handleSubmitOrder}
          />
        </div>

        <StatsPanel stats={stats} t={t} />
        <div className="data-grid">
          <OpenOrdersTable orders={openOrders} loading={accountLoading} language={language} t={t} />
          <HistoryOrdersTable orders={historyOrders} loading={accountLoading} language={language} t={t} />
        </div>
      </section>
    </main>
  );
}

export default App;
