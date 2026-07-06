import { describe, expect, it } from 'vitest';
import { analyzeReceipt, classifyExpense, extractAmount, extractDate, extractStoreName } from './classifier';

describe('classifyExpense(キーワード自動分類)', () => {
  it.each([
    ['JR東日本 乗車券 新宿→品川', '旅費交通費'],
    ['ヤマト運輸 宅急便 発送', '荷造運賃'],
    ['東京電力 電気料金', '水道光熱費'],
    ['コクヨ ボールペン ノート', '消耗品費'],
  ] as const)('%s → %s', (text, expected) => {
    expect(classifyExpense(text)).toBe(expected);
  });

  it('店舗名も判定材料に使われる', () => {
    expect(classifyExpense('お買い上げありがとうございます', 'ENEOS')).toBe('旅費交通費');
  });

  it('どのキーワードにも当たらなければ「その他」', () => {
    expect(classifyExpense('無関係のテキスト')).toBe('その他');
  });

  it('英文の部分一致で誤分類しない(旧キーワード「IC」の回帰防止)', () => {
    // "office"/"price" 等に含まれる "ic" で旅費交通費に誤爆していた
    expect(classifyExpense('Microsoft Office annual price')).toBe('その他');
  });
});

describe('extractAmount(領収書の金額抽出)', () => {
  it('領収書特有の「金 ￥」表記を最優先で拾う', () => {
    expect(extractAmount('領収書\n金 ￥2,500円\nただし飲食代として')).toBe(2500);
  });
  it('合計行を優先する(明細より合計)', () => {
    expect(extractAmount('コーヒー 480\nケーキ 520\n合計 ¥1,000')).toBe(1000);
  });
  it('カンマ区切り+円', () => {
    expect(extractAmount('お支払い 12,800円')).toBe(12800);
  });
  it('複数候補は最大値(合計の可能性が高い)', () => {
    expect(extractAmount('540円 1,200円 320円')).toBe(1200);
  });
  it('金額が無ければnull・範囲外(9円以下/1000万超)は拾わない', () => {
    expect(extractAmount('ありがとうございました')).toBeNull();
    expect(extractAmount('金 ￥5円')).toBeNull();
  });
});

// Date はローカルタイムで生成されるため、ローカル日付コンポーネントで比較する
const ymd = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

describe('extractDate(日付抽出)', () => {
  it('YYYY/MM/DD・YYYY年MM月DD日を読める', () => {
    expect(ymd(extractDate('2026/07/06 12:34'))).toBe('2026-07-06');
    expect(ymd(extractDate('2026年7月6日'))).toBe('2026-07-06');
  });
  it('月日だけなら今年とみなす', () => {
    const d = extractDate('7月6日');
    expect(d?.getFullYear()).toBe(new Date().getFullYear());
    expect(d?.getMonth()).toBe(6);
  });
  it('不正な月日はnull', () => {
    expect(extractDate('13月40日')).toBeNull();
    expect(extractDate('日付なし')).toBeNull();
  });
});

describe('extractStoreName(店舗名抽出)', () => {
  it('先頭行の店名・チェーン名を拾う', () => {
    expect(extractStoreName('セブンイレブン新宿店\n2026/07/06\n合計 500円')).toBe('セブンイレブン新宿店');
    expect(extractStoreName('株式会社サンプル商事\n領収書')).toBe('株式会社サンプル商事');
  });
  it('数字だけの行はスキップされる', () => {
    expect(extractStoreName('12345\nローソン渋谷店')).toBe('ローソン渋谷店');
  });
});

describe('analyzeReceipt(総合解析)', () => {
  it('金額・日付・店舗・カテゴリが一括で返る', () => {
    const r = analyzeReceipt('ENEOS 世田谷SS\n2026/07/01\nガソリン\n合計 ¥6,480');
    expect(r.amount).toBe(6480);
    expect(ymd(r.date)).toBe('2026-07-01');
    expect(r.storeName).toContain('ENEOS');
    expect(r.category).toBe('旅費交通費');
  });
});
