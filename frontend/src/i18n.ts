import type { OrderStatus } from './types';

export type Language = 'en' | 'zh';

export interface Translations {
  appName: string;
  mvp: string;
  simulationOnly: string;
  loginDescription: string;
  username: string;
  enterSimulator: string;
  logout: string;
  dismiss: string;
  language: string;
  market: string;
  lastPrice: string;
  updating: string;
  loadingMarket: string;
  eventContract: string;
  openPosition: string;
  direction: string;
  callUp: string;
  putDown: string;
  settlementCycle: string;
  stakeAmount: string;
  symbol: string;
  expiry: string;
  payout: string;
  invalidStake: string;
  submitting: string;
  confirmOrder: string;
  positions: string;
  openOrders: string;
  loading: string;
  id: string;
  cycle: string;
  side: string;
  stake: string;
  entry: string;
  countdown: string;
  noOpenOrders: string;
  ledger: string;
  history: string;
  close: string;
  status: string;
  profitLoss: string;
  settled: string;
  noHistory: string;
  totalTrades: string;
  winRate: string;
  totalPL: string;
  maxLoss: string;
  currentLossStreak: string;
  failedMarket: string;
  failedAccount: string;
  loginFailed: string;
  orderFailed: string;
  settling: string;
  minutesSuffix: string;
  statusText: Record<OrderStatus, string>;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Crypto Event Contract Simulator',
    mvp: 'MVP',
    simulationOnly: 'Simulation only',
    loginDescription: 'Use a local account. New users receive 1,000 virtual USDT. No real deposits, withdrawals, wallets, or live orders exist in this MVP.',
    username: 'QQ Account',
    enterSimulator: 'Enter Simulator',
    logout: 'Logout',
    dismiss: 'Dismiss',
    language: 'Language',
    market: 'Market',
    lastPrice: 'Last price',
    updating: 'Updating...',
    loadingMarket: 'Loading market data...',
    eventContract: 'Event Contract',
    openPosition: 'Open Position',
    direction: 'Direction',
    callUp: 'Up',
    putDown: 'Down',
    settlementCycle: 'Settlement Cycle',
    stakeAmount: 'Stake Amount (USDT)',
    symbol: 'Symbol',
    expiry: 'Expiry',
    payout: 'Payout',
    invalidStake: 'Stake must be at least 1 USDT and not exceed available balance.',
    submitting: 'Submitting...',
    confirmOrder: 'Open Now',
    positions: 'Positions',
    openOrders: 'Open Orders',
    loading: 'Loading...',
    id: 'ID',
    cycle: 'Cycle',
    side: 'Side',
    stake: 'Stake',
    entry: 'Entry',
    countdown: 'Countdown',
    noOpenOrders: 'No open simulated contracts.',
    ledger: 'Ledger',
    history: 'History',
    close: 'Close',
    status: 'Status',
    profitLoss: 'P/L',
    settled: 'Settled',
    noHistory: 'No settled orders yet.',
    totalTrades: 'Total Trades',
    winRate: 'Win Rate',
    totalPL: 'Total P/L',
    maxLoss: 'Max Loss',
    currentLossStreak: 'Current Loss Streak',
    failedMarket: 'Failed to load market data',
    failedAccount: 'Failed to load account data',
    loginFailed: 'Login failed',
    orderFailed: 'Order failed',
    settling: 'settling',
    minutesSuffix: 'm',
    statusText: {
      OPEN: 'OPEN',
      WON: 'WON',
      LOST: 'LOST',
      DRAW: 'DRAW',
      CANCELLED: 'CANCELLED',
    },
  },
  zh: {
    appName: '加密货币事件合约模拟器',
    mvp: '最小可用版',
    simulationOnly: '仅模拟交易',
    loginDescription: '使用本地账户登录。新用户默认获得 1,000 虚拟 USDT。本 MVP 不支持真实充值、提现、钱包或真实下单。',
    username: 'QQ号',
    enterSimulator: '进入模拟盘',
    logout: '退出',
    dismiss: '关闭',
    language: '语言',
    market: '行情',
    lastPrice: '最新价格',
    updating: '更新中...',
    loadingMarket: '正在加载行情数据...',
    eventContract: '事件合约',
    openPosition: '开仓',
    direction: '方向',
    callUp: '涨',
    putDown: '跌',
    settlementCycle: '结算周期',
    stakeAmount: '投入金额 (USDT)',
    symbol: '交易对',
    expiry: '到期时间',
    payout: '收益率',
    invalidStake: '投入金额至少 1 USDT，且不能超过可用余额。',
    submitting: '提交中...',
    confirmOrder: '直接下单',
    positions: '持仓',
    openOrders: '未结算订单',
    loading: '加载中...',
    id: '编号',
    cycle: '周期',
    side: '方向',
    stake: '投入',
    entry: '入场价',
    countdown: '倒计时',
    noOpenOrders: '暂无未结算模拟合约。',
    ledger: '账本',
    history: '历史订单',
    close: '收盘价',
    status: '状态',
    profitLoss: '盈亏',
    settled: '结算时间',
    noHistory: '暂无已结算订单。',
    totalTrades: '总交易次数',
    winRate: '胜率',
    totalPL: '总盈亏',
    maxLoss: '最大亏损',
    currentLossStreak: '连续亏损次数',
    failedMarket: '行情数据加载失败',
    failedAccount: '账户数据加载失败',
    loginFailed: '登录失败',
    orderFailed: '下单失败',
    settling: '结算中',
    minutesSuffix: '分',
    statusText: {
      OPEN: '未结算',
      WON: '盈利',
      LOST: '亏损',
      DRAW: '平局',
      CANCELLED: '已取消',
    },
  },
};

