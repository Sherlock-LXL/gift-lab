// Chinese guidance follows the model application's src/ui.py; no personal examples.
export const features = [
  {label: '兴趣匹配', hint: '对方明确喜欢它吗？', low: '明确不喜欢', high: '明确想要',
    strength: '对方对这类礼物的兴趣比较明确，这是当前方案的优势。',
    suggestion: '确认对方是否主动提过这件物品、品牌、作品、材质或风格。'},
  {label: '需求与实用性', hint: '现在需要、经常用得到吗？', low: '容易闲置', high: '每天需要',
    strength: '这件礼物具有较好的实际用途，不容易只在收到时开心一次。',
    suggestion: '优先考虑近期需要、能高频使用，或能解决具体问题的礼物。'},
  {label: '情感个性化', hint: '有没有专属于对方的心意？', low: '比较通用', high: '特别有意义',
    strength: '这件礼物能体现你对对方的了解，情感价值是明显优势。',
    suggestion: '加入手写卡片、共同记忆、特殊日期，或只有你们理解的细节。'},
  {label: '审美命中把握', hint: '款式、颜色是对方喜欢的吗？', low: '不合审美', high: '已经确认',
    strength: '你对对方审美的判断比较有把握，款式本身不太容易踩雷。',
    suggestion: '参考对方经常使用的颜色、材质、品牌与风格，减少凭感觉猜测。'},
  {label: '选择安全度', hint: '尺寸、型号这些细节确定吗？', low: '容易选错', high: '条件明确',
    strength: '型号、尺寸或版本等关键条件比较明确，选错的可能性较低。',
    suggestion: '确认尺寸、色号、型号、香型、肤质、兼容性及退换条件。'},
  {label: '收纳友好度', hint: '放得下，也不容易重复吗？', low: '占地重复', high: '小巧好收纳',
    strength: '礼物容易保存，也不太会造成重复或杂物负担。',
    suggestion: '考虑更小巧、可消耗、可替换，或不与已有物品重复的选择。'},
  {label: '价值匹配', hint: '在预算内，也值得这个价格吗？', low: '不太划算', high: '值得且自在',
    strength: '价格与质量、用途和情感价值比较匹配，预算使用较为合理。',
    suggestion: '比较同类替代品，并考虑实际使用频率是否足以支撑这个价格。'},
] as const;
export const categories = [
  {name: '首饰配饰', icon: '💍', tip: '确认材质、尺寸、佩戴习惯及金属过敏情况。'},
  {name: '周边收藏', icon: '🧸', tip: '确认作品或角色确实喜欢，并优先选择正版、方便收纳的款式。'},
  {name: '书籍文创', icon: '📖', tip: '确认版本、装帧、语言，以及是否已经拥有同一本书。'},
  {name: '电子影像', icon: '🎧', tip: '确认设备兼容性、存储需求、保修及实际使用场景。'},
  {name: '美妆香氛', icon: '🌷', tip: '确认色号、肤质、香调偏好和过敏风险。'},
  {name: '包袋服饰', icon: '👜', tip: '确认尺寸、颜色、日常穿搭风格和退换条件。'},
  {name: '生活日用', icon: '☕', tip: '实用不等于适合送礼，最好确认是对方真正需要的款式。'},
] as const;
export function scoreBand(score: number) {
  const bands = [
    [9, '非常推荐', '从当前评分看，是一份值得认真考虑的心意。'],
    [8.1, '很有希望', '整体匹配不错，再确认一下购买细节吧。'],
    [7, '值得考虑', '方向不错，留意还有哪些细节不够确定。'],
    [6, '有一定潜力', '有一些优点，可以先改善相对薄弱的环节。'],
    [5.3, '略偏正面', '可以再确认需求，或增加一点专属的心意。'],
    [3.8, '匹配度不明确', '目前还不够确定，先多了解一点偏好吧。'],
    [2.1, '风险较高', '有些条件可能不合适，建议先确认关键细节。'],
    [0, '不太推荐', '可以考虑换一个方向，再找找更合适的礼物。'],
  ] as const;
  const [, title, description] = bands.find(([minimum]) => score >= minimum) || bands[bands.length - 1];
  return {title, description};
}
export function feedback(scores: number[], category: number) {
  const strongest = scores.indexOf(Math.max(...scores));
  const strength = scores[strongest] >= 7 ? features[strongest].strength : scores[strongest] >= 5
    ? `${features[strongest].label}相对较稳定（${scores[strongest].toFixed(1)}/10），但还不足以视为明显优势。`
    : '目前七项评分都偏低，可以先重新确认礼物方向。';
  const suggestions: string[] = scores.map((score, index) => ({score, index})).sort((a, b) => a.score - b.score || a.index - b.index)
    .filter(({score}) => score < 7.5).slice(0, 2).map(({index}) => features[index].suggestion);
  if (!suggestions.length) suggestions.push('七项评分都比较稳定，购买前确认商品质量和送达时间即可。');
  return {strength, suggestions, categoryTip: categories[category].tip};
}
