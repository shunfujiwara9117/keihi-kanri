import { CategoryInfo } from '@/types/expense';

// 経費カテゴリの定義（キーワードベース自動分類用）
export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  {
    name: '給料賃金',
    description: '従業員への給与・賃金',
    keywords: ['給料', '給与', '賃金', '人件費', 'アルバイト', 'パート', '社員'],
  },
  {
    name: '外注工賃',
    description: '外部への業務委託費用',
    keywords: ['外注', '業務委託', '委託費', 'フリーランス', '外部委託'],
  },
  {
    name: '減価償却費',
    description: '固定資産の減価償却',
    keywords: ['減価償却', 'パソコン購入', 'PC購入', '機械購入', '車両購入'],
  },
  {
    name: '貸倒金',
    description: '回収不能になった債権',
    keywords: ['貸倒', '不良債権', '回収不能'],
  },
  {
    name: '地代家賃',
    description: 'オフィス・店舗の賃料',
    keywords: ['家賃', '賃料', '地代', 'オフィス', '事務所', '店舗', 'レンタル', '賃貸'],
  },
  {
    name: '利子割引料',
    description: '借入金の利息',
    keywords: ['利息', '利子', '金利', 'ローン', '借入'],
  },
  {
    name: '租税公課',
    description: '税金・公的負担金',
    keywords: ['税金', '印紙', '収入印紙', '事業税', '固定資産税', '自動車税', '公課'],
  },
  {
    name: '荷造運賃',
    description: '商品発送・運送費用',
    keywords: ['送料', '配送', '運送', '宅配', 'ヤマト', '佐川', '郵便', 'クロネコ', 'ゆうパック', '荷造'],
  },
  {
    name: '水道光熱費',
    description: '水道・電気・ガス代',
    keywords: ['電気', 'ガス', '水道', '光熱費', '電気代', 'ガス代', '水道代', '電力'],
  },
  {
    name: '旅費交通費',
    description: '交通費・出張費',
    // 注: 「IC」単体は英文(office/price等)の部分一致で誤分類するため「ICカード」に限定
    keywords: ['交通費', '電車', 'タクシー', 'バス', '新幹線', '飛行機', 'ホテル', '宿泊', '出張', '旅費',
      'Suica', 'PASMO', 'ICカード', 'JR', '乗車券', '切符', '航空券', 'ガソリン', 'ENEOS', '出光',
      '高速道路', 'ETC', 'NEXCO', '駐車場', 'パーキング'],
  },
  {
    name: '通信費',
    description: '電話・インターネット代',
    keywords: ['通信', '電話', 'インターネット', 'プロバイダ', 'WiFi', '携帯', 'スマホ', '回線', 'docomo', 'au', 'softbank', 'ソフトバンク'],
  },
  {
    name: '広告宣伝費',
    description: '広告・宣伝費用',
    keywords: ['広告', '宣伝', 'チラシ', 'ポスター', 'Google広告', 'Facebook広告', 'Instagram広告', 'SNS広告', 'リスティング'],
  },
  {
    name: '接待交際費',
    description: '取引先との接待・交際費',
    keywords: ['接待', '交際', '飲食', '食事', '居酒屋', 'レストラン', '接待費', '懇親会', '贈答'],
  },
  {
    name: '損害保険料',
    description: '各種保険料',
    keywords: ['保険', '火災保険', '自動車保険', '賠償責任保険', '損害保険'],
  },
  {
    name: '修繕費',
    description: '建物・設備の修繕費',
    keywords: ['修繕', '修理', 'リフォーム', '補修', 'メンテナンス', '整備'],
  },
  {
    name: '消耗品費',
    description: '事務用品・消耗品',
    keywords: ['文房具', 'ボールペン', 'ノート', 'コピー用紙', 'プリンター', 'インク', 'トナー', 'セブンイレブン', 'ローソン', 'ファミマ', 'ファミリーマート', 'コンビニ', '100円', 'ダイソー', '事務用品', '消耗品'],
  },
  {
    name: '福利厚生費',
    description: '従業員の福利厚生',
    keywords: ['福利厚生', '慰安', '社員旅行', '健康診断', '社員食堂'],
  },
  {
    name: '研修費',
    description: 'セミナー・研修費用',
    keywords: ['研修', 'セミナー', '講習', '勉強会', 'スクール', '講座', '教育', '資格'],
  },
  {
    name: '雑費',
    description: 'その他の雑費',
    keywords: ['雑費', 'その他'],
  },
  {
    name: 'その他',
    description: 'その他の経費',
    keywords: [],
  },
];

// カテゴリ名から CategoryInfo を取得
export const getCategoryInfo = (categoryName: string): CategoryInfo | undefined => {
  return EXPENSE_CATEGORIES.find((cat) => cat.name === categoryName);
};

// すべてのカテゴリ名を取得
export const getAllCategoryNames = (): string[] => {
  return EXPENSE_CATEGORIES.map((cat) => cat.name);
};
