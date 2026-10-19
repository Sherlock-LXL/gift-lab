// Reviewed, concrete product concepts. Prices are illustrative CNY ranges, not quotes.
// This source generates the shared, versioned JSON consumed by both TS and Python.
import { mkdirSync, writeFileSync } from 'node:fs';
const categories = ['首饰配饰', '周边收藏', '书籍文创', '电子影像', '美妆香氛', '包袋服饰', '生活日用'];
// name | price | description | family | style | function | risk | storage | interest
const rows = [
[
  '银色小圆环耳夹|60|不用耳洞，也能戴的一对小耳夹|earclip|简简单单|装饰|佩戴舒适度|小巧',
  '细链珍珠项链|180|一颗小珍珠，搭配日常衣服|necklace|精致漂亮|装饰|材质过敏|小巧',
  '蓝色玻璃手链|50|透亮的蓝色玻璃珠手链|bracelet|有设计感|装饰|手围|小巧',
  '黑色金属戒指|90|线条利落的黑色开口戒指|ring|酷酷的|装饰|戒围|小巧',
  '复古花朵胸针|40|可以别在外套上的小花胸针|brooch|复古文艺|装饰|无|小巧',
  '丝绒蝴蝶结发夹|30|扎头发时可以用的柔软发夹|hairclip|可可爱爱|整理头发|发量|小巧',
  '真丝印花小方巾|220|系在脖子或包上的印花方巾|scarf|精致漂亮|搭配|无|可折叠',
  '极简皮带手表|450|白色表盘，棕色皮质表带|watch|简简单单|看时间|腕围|小巧',
  '猫爪钥匙扣|35|一只软软的小猫爪挂在钥匙上|keyring|可可爱爱|整理钥匙|无|小巧|猫咪',
  '音符珐琅别针|45|一枚小小音符，可以别在包上|pin|有设计感|装饰|无|小巧|音乐',
  '手工串珠手绳|65|自己搭配颜色的串珠材料包|beading|有趣搞怪|手作|需要动手|小巧|手工',
  '地图行李牌|40|旅行时挂在箱子上的地图行李牌|luggage-tag|复古文艺|辨认行李|无|小巧|旅行',
  '不锈钢领针|80|一枚细长银色领针，适合衬衫|collar-pin|简简单单|装饰|衣服搭配|小巧',
  '金色脚链|100|夏天搭配凉鞋的细脚链|anklet|精致漂亮|装饰|脚围|小巧',
  '运动发带|25|运动时固定头发的弹力发带|headband|简简单单|运动|头围|可折叠',
  '羊毛贝雷帽胸饰|55|可以拆下的小羊毛装饰|wool-charm|可可爱爱|装饰|无|小巧',
],
[
  '小熊毛绒玩偶|80|一只可以抱着的三十厘米小熊|plush|可可爱爱|陪伴|无|中等',
  '积木花束|150|需要自己拼搭的彩色积木花|brick-flower|有设计感|手作|需要动手|中等',
  '透明亚克力展示盒|90|可以摆放小收藏的透明盒子|display-box|简简单单|收纳|尺寸|中等',
  '迷你旋转木马音乐盒|160|拧一下，就会转动并响起音乐|music-box|复古文艺|欣赏|无|中等',
  '大号落地毛绒鹅|260|长约一米，适合抱着的大鹅|giant-goose|有趣搞怪|陪伴|无|占地方',
  '博物馆冰箱贴套装|60|三枚不同建筑造型的冰箱贴|magnet|复古文艺|装饰|磁性表面|小巧',
  '小巧星球摆件|75|桌面上一颗透明的小星球|ornament|有设计感|装饰|无|小巧',
  '拼图一千片|100|一幅需要慢慢完成的风景拼图|puzzle|复古文艺|消遣|需要耐心|中等',
  '趴着的猫咪玩偶|95|一只可以放在桌边的软软小猫|cat-plush|可可爱爱|陪伴|无|中等|猫咪',
  '演出纪念票收纳册|55|把看过的演出票整整齐齐收起来|ticket-album|简简单单|纪念|无|小巧|音乐',
  '羊毛毡小动物材料包|70|用羊毛和戳针做一只小动物|felt-kit|可可爱爱|手作|需要动手|小巧|手工',
  '旅行城市微缩模型|120|一座放在书架上的城市小模型|city-model|复古文艺|纪念|无|中等|旅行',
  '树脂恐龙化石模型|130|可以摆在书桌上的小恐龙骨架|dinosaur|酷酷的|欣赏|无|中等',
  '透明沙漏|45|一个能流动五分钟的沙漏|hourglass|简简单单|计时|易碎|小巧',
  '随机角色盲盒|69|打开前不知道会是哪一个角色|blindbox|可可爱爱|惊喜|角色随机|小巧',
  '木质国际象棋|180|一套可以双人玩的木棋盘|chess|复古文艺|消遣|需要了解规则|中等',
],
[
  '硬壳横线笔记本|45|纸张厚实，适合日常随手记|notebook|简简单单|记录|无|小巧',
  '植物插画明信片|35|十二张可以寄出或贴墙的明信片|postcard|复古文艺|记录|无|小巧',
  '短篇小说集|60|适合睡前翻几页的短篇故事|novel|复古文艺|阅读|阅读口味|小巧',
  '黑色钢笔礼盒|240|一支钢笔和一瓶墨水|pen|精致漂亮|书写|握笔习惯|小巧',
  '桌面每日计划本|40|把每天想做的事情写在一页上|planner|简简单单|记录|无|小巧',
  '彩色和纸胶带|30|六卷可以装饰手账的图案胶带|tape|可可爱爱|装饰|无|小巧',
  '世界摄影大画册|280|一本厚厚的彩色风景摄影集|photo-book|有设计感|阅读|无|占地方',
  '磁吸书签套装|25|四枚不容易从书页滑落的小书签|bookmark|简简单单|阅读|无|小巧',
  '猫咪贴纸包|20|可以贴在笔记本上的猫咪贴纸|cat-sticker|可可爱爱|装饰|无|小巧|猫咪',
  '简单吉他和弦手册|55|适合练习时翻看的和弦小册子|chord-book|简简单单|学习|需要乐器|小巧|音乐',
  '水彩入门套装|140|十二色水彩和一本练习小册|watercolor|有设计感|手作|需要动手|中等|手工',
  '城市散步地图册|80|按路线寻找街角小店和老建筑|walk-guide|复古文艺|探索|城市适用性|小巧|旅行',
  '菜谱翻页小书|50|包含二十道容易做的家常菜|cookbook|简简单单|做饭|无|小巧|美食',
  '趣味冷知识日历|65|每天翻开一条小知识|calendar|有趣搞怪|阅读|年份|小巧',
  '机械铅笔套装|85|一支自动铅笔和替换笔芯|pencil|简简单单|书写|笔芯规格|小巧',
  '立体纸雕贺卡|35|打开会立起一座小花园的卡片|popup-card|精致漂亮|纪念|无|可折叠',
],
[
  '白色半入耳蓝牙耳机|250|通勤听歌用，附小巧充电盒|earbuds|简简单单|听歌|耳型和手机兼容|小巧',
  '便携蓝牙音箱|180|可以放在书桌或带到户外的小音箱|speaker|简简单单|听歌|蓝牙兼容|小巧',
  '拍立得相机|650|按下快门，就能得到一张小照片|instant-camera|复古文艺|拍照|耗材成本|中等',
  '手机支架|40|角度可以调整的桌面支架|phone-stand|简简单单|支撑手机|设备尺寸|小巧',
  '机械键盘|400|按键有清晰手感的桌面键盘|keyboard|酷酷的|输入|接口和轴体偏好|中等',
  '迷你照片打印机|500|把手机里的照片打印成小纸片|photo-printer|可可爱爱|打印|手机兼容和耗材|小巧',
  '大容量充电宝|150|外出时给手机补电的充电宝|powerbank|简简单单|充电|接口|中等',
  '电子阅读器|900|用来读电子书的黑白墨水屏|ereader|简简单单|阅读|书籍格式|小巧',
  '猫耳有线耳机|120|带小猫耳朵装饰的头戴耳机|cat-headset|可可爱爱|听歌|接口和头围|中等|猫咪',
  '入门口袋合成器|300|可以随手编一段小旋律|synth|酷酷的|创作音乐|学习成本|小巧|音乐',
  '手机微距镜头夹|95|夹在手机上拍食物或小细节|macro-lens|简简单单|拍照|镜头位置兼容|小巧|美食',
  '便携行李电子秤|60|出发前称一称行李有多重|luggage-scale|简简单单|称重|无|小巧|旅行',
  '桌面电子时钟|75|显示时间和温度的数字时钟|clock|简简单单|看时间|供电方式|小巧',
  '运动手环|220|记录日常步数和运动时长|fitness-band|简简单单|运动|腕围和手机兼容|小巧',
  'USB桌面小风扇|65|放在桌角吹一点凉风|fan|可可爱爱|降温|USB供电|小巧',
  '柔光自拍补光灯|85|夹在手机上拍照时补光|selfie-light|简简单单|拍照|手机厚度|小巧',
],
[
  '淡茶香固体香膏|80|装在小盒里，出门可以随手带|solid-perfume|简简单单|香氛|气味和过敏|小巧',
  '无香护手霜|50|洗手后可以用的便携护手霜|handcream|简简单单|护理|肤质过敏|小巧',
  '花香香水小样套装|180|五支不同花香的小瓶香水|perfume|精致漂亮|香氛|气味和过敏|小巧',
  '小巧随身化妆镜|60|可以折起放进包里的小镜子|mirror|精致漂亮|整理仪容|无|小巧',
  '暖色口红|220|一支偏暖色的日常口红|lipstick|精致漂亮|化妆|色号和肤质|小巧',
  '浴盐礼盒|95|三小袋不同气味的泡澡浴盐|bath-salt|简简单单|放松|浴缸和过敏|小巧',
  '香薰蜡烛|130|玻璃杯里的木质香蜡烛|candle|复古文艺|香氛|明火和气味|小巧',
  '基础保湿面膜|100|五片独立包装的保湿面膜|mask|简简单单|护理|肤质过敏|小巧',
  '猫咪香薰石|55|滴入香油后放在桌边的小猫石膏|cat-aroma|可可爱爱|香氛|气味|小巧|猫咪',
  '手工皂制作材料包|90|可以自己做两块小肥皂|soap-kit|有设计感|手作|需要动手和过敏|小巧|手工',
  '甜橙香氛喷雾|70|带一点甜橙气味的房间喷雾|orange-spray|简简单单|香氛|气味过敏|小巧|美食',
  '旅行洗漱分装瓶|45|一组防漏的小瓶子和收纳袋|travel-bottle|简简单单|收纳|无|小巧|旅行',
  '头皮按摩梳|40|洗头时可以轻轻按摩的软梳|scalp-brush|简简单单|护理|头皮敏感|小巧',
  '彩色指甲油套装|110|三瓶适合搭配的不同颜色指甲油|nail-polish|有设计感|化妆|气味过敏|小巧',
  '电动洁面仪|350|可调档位的硅胶洁面仪|face-device|简简单单|护理|肤质和充电|小巧',
  '缎面睡眠眼罩|65|遮光用的柔软眼罩|eye-mask|简简单单|睡眠|头围|可折叠',
],
[
  '帆布通勤托特包|100|可以放水杯和书的布包|tote|简简单单|收纳|无|可折叠',
  '小号皮质斜挎包|450|出门装手机和钥匙的小包|crossbody|精致漂亮|收纳|肩带长度|中等',
  '纯色棉质短袖|90|一件宽松的纯色短袖|tshirt|简简单单|穿着|衣服尺码|可折叠',
  '厚实羊毛围巾|260|冬天围在脖子上的柔软围巾|winter-scarf|复古文艺|保暖|材质过敏|可折叠',
  '刺绣棒球帽|80|帽檐带有小图案的遮阳帽|cap|酷酷的|遮阳|头围|中等',
  '轻便运动背包|220|有多个收纳袋的双肩包|backpack|简简单单|收纳|背负尺寸|中等',
  '毛绒居家拖鞋|65|冬天在家穿的软拖鞋|slippers|可可爱爱|穿着|鞋码|中等',
  '小格纹零钱包|50|可以装硬币和耳机的小包|coin-purse|复古文艺|收纳|无|小巧',
  '猫咪刺绣棉袜|35|袜口绣着小猫的一双棉袜|cat-socks|可可爱爱|穿着|脚码|可折叠|猫咪',
  '唱片图案帆布袋|75|印有复古唱片图案的轻便布袋|record-bag|复古文艺|收纳|无|可折叠|音乐',
  '编织小包材料包|110|包含棉线、钩针和图解的材料包|crochet-bag|复古文艺|手作|需要动手|小巧|手工',
  '旅行衣物收纳袋|70|大小不同的三只拉链收纳袋|packing-cube|简简单单|收纳|无|可折叠|旅行',
  '长款雨衣|100|下雨天可以收进袋里的雨衣|raincoat|简简单单|防雨|衣服尺码|可折叠',
  '绒面西装外套|500|一件需要搭配尺码的休闲外套|blazer|精致漂亮|穿着|衣服尺码|中等',
  '轻便跑步腰包|55|跑步时可以贴身装手机|running-belt|简简单单|运动|腰围|小巧',
  '针织披肩|160|空调房里可以披上的针织披肩|shawl|复古文艺|保暖|材质过敏|可折叠',
],
[
  '纯色陶瓷杯|65|三百毫升的日常喝水杯|mug|简简单单|喝水|易碎|小巧',
  '月亮造型小夜灯|90|床头的一盏柔和暖光灯|nightlight|简简单单|照明|供电方式|小巧',
  '双层不锈钢保温杯|140|出门可以装热水的保温杯|thermos|简简单单|喝水|无|小巧',
  '桌面分类收纳盒|70|可以把文具和零碎小物分开放|organizer|简简单单|收纳|尺寸|中等',
  '折叠晴雨伞|90|晴雨天都可以放进包里的伞|umbrella|简简单单|遮雨|无|小巧',
  '小型手冲咖啡壶|180|慢慢冲一杯咖啡的玻璃壶|coffee-pot|复古文艺|冲饮|易碎和耗材|中等',
  '多肉盆栽|40|一盆需要偶尔照料的小多肉|plant|可可爱爱|种植|需要养护|小巧',
  '迷你电煮锅|200|一个人也能煮面的小锅|cooker|简简单单|做饭|插座和清洗|中等',
  '猫咪陶瓷筷子架|30|吃饭时可以把筷子放在小猫背上|cat-rest|可可爱爱|用餐|易碎|小巧|猫咪',
  '手作陶泥体验材料盒|100|在家捏一只自己的小碟子|clay-kit|有设计感|手作|需要动手|中等|手工',
  '饼干与茶包小礼盒|85|四种饼干和独立包装的茶包|snack-box|精致漂亮|品尝|饮食过敏|小巧|美食',
  '便携野餐垫|120|折起来很小，展开可以坐两个人|picnic-mat|简简单单|户外|无|可折叠|旅行',
  '大号懒人沙发|600|可以窝着看书的大坐垫|beanbag|可可爱爱|休息|无|占地方',
  '柔软盖毯|130|午睡时盖在身上的小毯子|blanket|简简单单|保暖|材质过敏|中等',
  '香草种植套装|75|从种子开始养一盆小薄荷|herb-kit|简简单单|种植|需要养护|小巧',
  '小型早餐三明治机|260|可以压烤面包的早餐小机器|sandwich-maker|可可爱爱|做饭|插座和清洗|中等',
]];
const icons = [
  ['💍','📿','📿','💍','🌸','🎀','🧣','⌚','🐾','🎵','📿','🧳','✨','📿','🎽','🌼'],
  ['🧸','💐','📦','🎠','🪿','🏛️','🪐','🧩','🐈','🎟️','🧶','🏙️','🦕','⌛','🎁','♟️'],
  ['📓','💌','📕','🖋️','📒','🎀','📸','🔖','🐈','🎸','🎨','🗺️','🍳','📅','✏️','💌'],
  ['🎧','🔊','📷','📱','⌨️','🖨️','🔋','📖','🎧','🎹','📷','🧳','🕰️','⌚','🌀','💡'],
  ['🌷','🧴','🌸','🪞','💄','🛁','🕯️','🧖','🐈','🧼','🍊','🧴','🪮','💅','🧴','🌙'],
  ['👜','👜','👕','🧣','🧢','🎒','🥿','👝','🧦','👜','🧶','🧳','🌧️','🧥','🏃','🧣'],
  ['☕','🌙','🥤','📦','☂️','☕','🌵','🍲','🐈','🎨','🍪','🧺','🛋️','🛏️','🌱','🥪'],
];
const gifts = rows.flatMap((group, category) => group.map((row, i) => {
  const [name, p, description, family_id, style, fn, risk, storage, interest] = row.split('|');
  const price = Number(p);
  return {
    id: `g${category + 1}${String(i + 1).padStart(2, '0')}`, family_id, name,
    category: categories[category], price_cny: [Math.round(price * .8), Math.round(price * 1.2)],
    description, style_tags: [style], function_tags: [fn], scenario: fn === '穿着' ? '出门或日常穿搭' : fn === '手作' ? '空闲时慢慢完成' : '日常生活',
    selection_risks: risk === '无' ? [] : risk.split('和'),
    storage, use_frequency: ['装饰', '纪念', '手作', '拍照', '消遣'].includes(fn) ? '偶尔' : '经常',
    icon: icons[category][i],
    audience: interest ? 'personalized' : 'general', interest_tags: interest ? [interest] : [],
    brand: '未指定', customization: '无', role: 'rating',
  };
}));
const pairs = [];
// Pair variants share an explicit family; no renamed variants can bypass the family exclusion.
function pair(id, baseFamily, names, factor, changes, opts = {}) {
  const base = gifts.find(g => g.family_id === baseFamily);
  if (!base) throw Error(baseFamily);
  const variants = names.map((name, i) => ({
    ...structuredClone(base), id: `${id}${i ? 'b' : 'a'}`, name, role: 'pair',
    audience: opts.personal ? 'personalized' : 'general',
    interest_tags: opts.personal ? [opts.personal] : [],
    ...changes[i],
  }));
  gifts.push(...variants);
  pairs.push({
    id, gift_ids: variants.map(g => g.id),
    comparison_type: opts.type || 'controlled', tested_factors: [factor],
    changed_variables: [...new Set([factor, ...(opts.confounds || [])])],
    confounds: opts.confounds || [],
    audience: opts.personal ? 'personalized' : 'general',
    consistency_of: opts.check || null,
    interpretation: opts.note || '情境中的局部选择；只解释列出的差异，不等于绝对评分。',
  });
}
const desc = (a, b) => [{description:a}, {description:b}];
pair('p01','nightlight',['猫咪小夜灯','简约月亮小夜灯'],'appearance',
  [{description:'一样的暖光和亮度，猫咪造型',style_tags:['可可爱爱']},{description:'一样的暖光和亮度，月亮造型',style_tags:['简简单单']}],{personal:'猫咪'});
pair('p02','mug',['奶油白陶瓷杯','淡紫色陶瓷杯'],'color',desc('同款三百毫升陶瓷杯，奶油白色','同款三百毫升陶瓷杯，淡紫色'));
pair('p03','notebook',['素面笔记本','印有你选的图案的笔记本'],'customization',
  [{description:'同款本子，封面没有图案',customization:'无'},{description:'同款本子，封面印你自己选的图案',customization:'自选图案'}],{confounds:['appearance']});
pair('p04','thermos',['膳魔师保温杯','普通品牌保温杯'],'brand',
  [{description:'假设容量、保温和售后一样，膳魔师品牌',brand:'膳魔师'},{description:'假设容量、保温和售后一样，普通品牌',brand:'普通品牌'}],
  {note:'假设情境下的品牌偏好，不代表真实产品质量相等。'});
pair('p05','ornament',['掌心大小的星球摆件','两只手大小的星球摆件'],'size',
  [{description:'同款星球，同样价格，掌心大小',storage:'小巧'},{description:'同款星球，同样价格，两只手大小',storage:'占地方'}]);
pair('p06','keyring',['猫咪钥匙扣','小熊钥匙扣'],'theme',desc('同样材质和大小，一只小猫','同样材质和大小，一只小熊'),{personal:'猫咪'});
pair('p07','speaker',['奶油白小音箱','黑色小音箱'],'color',desc('同款蓝牙音箱，奶油白外壳','同款蓝牙音箱，纯黑色外壳'));
pair('p08','pen',['普通纸盒装钢笔','礼盒丝带装钢笔'],'packaging',desc('同一支笔，简洁纸盒包装','同一支笔，礼盒和丝带包装'));
pair('p09','tote',['纯色帆布袋','唱片图案帆布袋'],'theme',desc('同款帆布袋，素色没有图案','同款帆布袋，印有复古唱片'),{personal:'音乐'});
pair('p10','candle',['淡茶香蜡烛','淡花香蜡烛'],'scent',desc('同样蜡材和大小，淡淡茶香','同样蜡材和大小，淡淡花香'));
pair('p11','mirror',['圆形随身镜','方形随身镜'],'shape',desc('同样尺寸和材质，圆形外壳','同样尺寸和材质，方形外壳'));
pair('p12','notebook',['普通品牌笔记本','MUJI笔记本'],'brand',
  [{description:'假设纸张和装订一样，普通品牌',brand:'普通品牌'},{description:'假设纸张和装订一样，MUJI品牌',brand:'MUJI'}]);
pair('p13','umbrella',['浅粉色晴雨伞','薄荷绿晴雨伞'],'color',desc('同款折叠晴雨伞，浅粉色','同款折叠晴雨伞，薄荷绿色'));
pair('p14','beading',['串珠手链成品','同款手链材料包'],'participation',
  [{description:'同样珠子，已经串好，直接戴',selection_risks:['手围']},{description:'同样珠子和工具，自己慢慢串',selection_risks:['需要动手']}],
  {personal:'手工',confounds:['effort','completion_state']});
pair('p15','phone-stand',['素面手机支架','笑脸图案手机支架'],'appearance',desc('同款支架，没有装饰图案','同款支架，印着一个小笑脸'));
pair('p16','postcard',['风景照片明信片','风景手绘明信片'],'art_style',desc('同样的风景主题，用照片呈现','同样的风景主题，用手绘呈现'));
pair('p17','mug',['带手写卡片的杯子','带印刷卡片的杯子'],'personal_note',
  [{description:'同一个杯子，附一句手写祝福',customization:'手写祝福'},{description:'同一个杯子，相同祝福印在卡上',customization:'印刷祝福'}]);
pair('p18','organizer',['透明收纳盒','米白收纳盒'],'opacity',desc('同款收纳盒，能看见里面的东西','同款收纳盒，米白色不透明'),{confounds:['color']});
// Eight tradeoffs explicitly record jointly changing variables.
pair('p19','mug',['每天用的保温杯','印着共同回忆的纪念杯'],'utility_vs_memory',
  [{description:'保温好，适合每天带出门',function_tags:['喝水'],customization:'无',selection_risks:[]},
   {description:'普通陶瓷杯，印着一次共同出游的照片',function_tags:['喝水','纪念'],customization:'共同回忆',selection_risks:['易碎']}],
  {type:'tradeoff',confounds:['material','insulation','customization']});
pair('p20','mirror',['实惠简洁随身镜','精致雕花随身镜'],'price_vs_appearance',
  [{description:'镜面一样清晰，塑料素面外壳',price_cny:[25,35],style_tags:['简简单单']},
   {description:'镜面一样清晰，金属雕花外壳',price_cny:[100,120],style_tags:['精致漂亮']}],
  {type:'tradeoff',confounds:['price','material','appearance']});
pair('p21','notebook',['天天用的计划本','偶尔玩的趣味问答本'],'frequency_vs_fun',
  [{description:'记录每天安排，随时可以用',function_tags:['记录'],use_frequency:'经常'},
   {description:'聚会时翻开的趣味问答本',function_tags:['消遣'],use_frequency:'偶尔'}],
  {type:'tradeoff',confounds:['purpose','frequency','novelty']});
pair('p22','candle',['熟悉的淡茶香蜡烛','没试过的森林香蜡烛'],'familiarity_vs_novelty',
  desc('假设你闻过并接受这个味道','假设你没闻过，带来一点新鲜感'),
  {type:'tradeoff',confounds:['scent','familiarity']});
pair('p23','tote',['自己选的实用帆布袋','朋友悄悄选的帆布袋'],'control_vs_surprise',
  desc('款式完全由你自己挑','假设朋友认真挑了，但你提前不知道款式'),
  {type:'tradeoff',confounds:['selection_control','uncertainty','surprise']});
pair('p24','ornament',['小巧朴素桌面摆件','大一些的精致桌面摆件'],'storage_vs_appearance',
  [{description:'简洁素面，只占一个小角落',storage:'小巧',style_tags:['简简单单']},
   {description:'细节丰富，需要更多桌面位置',storage:'占地方',style_tags:['精致漂亮']}],
  {type:'tradeoff',confounds:['size','detail','appearance']});
pair('p25','snack-box',['熟悉口味的饼干礼盒','新奇口味的饼干礼盒'],'familiarity_vs_discovery',
  desc('六小袋平时吃过的经典口味','六小袋没吃过的特别口味'),
  {type:'tradeoff',personal:'美食',confounds:['flavor','familiarity']});
pair('p26','walk-guide',['一本旅行攻略书','一本旅行空白记录册'],'guidance_vs_memory',
  [{description:'出发前可以照着规划行程',function_tags:['探索']},{description:'旅途中贴照片、写回忆',function_tags:['记录','纪念']}],
  {type:'tradeoff',personal:'旅行',confounds:['purpose','effort','timing']});
// Four local consistency checks are always placed well after their linked question.
pair('p27','mug',['淡紫色早餐杯','奶油白早餐杯'],'color',desc('同款三百毫升杯，淡紫色','同款三百毫升杯，奶油白色'),
  {type:'consistency',check:'p02',note:'与 p02 语义反向映射；只观察颜色选择的局部稳定性。'});
pair('p28','ornament',['稍大的透明星球','小小的透明星球'],'size',
  [{description:'同款同价，两只手大小',storage:'占地方'},{description:'同款同价，掌心大小',storage:'小巧'}],
  {type:'consistency',check:'p05'});
pair('p29','umbrella',['薄荷绿便携伞','浅粉色便携伞'],'color',desc('同款便携晴雨伞，薄荷绿','同款便携晴雨伞，浅粉色'),
  {type:'consistency',check:'p13'});
pair('p30','pen',['丝带礼盒里的钢笔','简单纸盒里的钢笔'],'packaging',desc('同一支笔，盒子上有丝带','同一支笔，简单的纸盒'),
  {type:'consistency',check:'p08'});
const bank = {
  version:'1.0', categories,
  known_interest_basis: '游戏作者给出的主题假设：猫咪、音乐、手工、美食、旅行；并非玩家已确认偏好。',
  price_note:'人民币示意区间；成对问题是明确条件下的假设商品，不是购买链接或真实报价。',
  gifts, pairs,
};
const path = new URL('../src/data/bank.json', import.meta.url);
mkdirSync(new URL('../src/data/', import.meta.url), {recursive:true});
writeFileSync(path, JSON.stringify(bank, null, 2) + '\n');
console.log(`${gifts.filter(g => g.role === 'rating').length} rating gifts; ${pairs.length} pairs; ${gifts.length} total concepts`);
