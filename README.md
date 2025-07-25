# 豆瓣评分调整器

一个Chrome浏览器扩展，用于分析豆瓣电影评分的数据健康度，并在检测到可能的刷分行为时提供调整后的评分。

## 功能特性

- **智能检测**: 自动检测可能的5星水分和1星恶意刷分
- **动态权重**: 基于50%分位数的权重调整，精准反映评分分布中心
- **科学算法**: 基于统计学原理，结合比例分布和权重优化
- **可视化展示**: 用颜色区分调整状态，绿色表示未调整，红色表示已调整
- **实时更新**: 支持页面动态加载和路由变化

## 安装方法

1. 下载或克隆此项目到本地
2. 打开Chrome浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用方法

1. 安装扩展后，访问任意豆瓣电影详情页（如：https://movie.douban.com/subject/xxxx/）
2. 扩展会自动分析页面中的评分数据
3. 在原评分旁边显示调整后的分数，用颜色区分状态：
   - **绿色数字**: 表示未检测到异常，显示正常计算结果
   - **红色数字**: 表示检测到异常并进行了调整
4. 如有调整，下方会显示详细的调整说明

## 算法原理

### 评分计算方法
- 基础权重：1星=1.5分，2星=3.5分，3星=5.5分，4星=7.5分，5星=9.5分
- **基于50%分位数的动态权重调整**：
  1. 按各星级比例从高到低排序
  2. 计算累积比例，找到50%分位数所在的星级
  3. 根据50%分位数星级选择权重调整策略：
     - 5星分位数：轻微正向调整 [0.1, 0.03, 0, -0.03, -0.1]
     - 4星分位数：强烈正向调整 [0.5, 0.015, 0, -0.015, -0.5]
     - 3星分位数：轻微正向调整 [0.1, 0.03, 0, -0.03, -0.1]
     - 2星分位数：强烈负向调整 [-0.5, -0.015, 0, 0.015, 0.5]
     - 1星分位数：轻微负向调整 [-0.1, -0.03, 0, 0.03, 0.1]
- 最终分数 = (各星级比例 × 调整后权重的总和) ÷ 100

### 异常检测规则
1. **5星水分检测**: 
   - 条件1：4星投票数大于0
   - 条件2：5星/4星比例 > 3.0
   - 条件3：2星 > 5星（确保不是正常的高分电影）
   
2. **1星恶意刷分检测**: 
   - 条件1：2星投票数大于0
   - 条件2：1星/2星比例 > 3.0
   - 条件3：5星 > 2星（确保存在评价分化）

### 调整策略
1. **5星调整**: 检测到5星水分时，将5星比例调整为4星比例
2. **1星调整**: 检测到1星恶意刷分时，将1星比例调整为2星比例
3. **比例归一化**: 调整后重新计算所有星级比例，确保总和为100%

### 完整算分步骤
1. 提取页面中各星级的评分比例
2. 执行异常检测，判断是否存在刷分行为
3. 如检测到异常，按调整策略修改对应星级比例
4. 对调整后的比例进行归一化处理，保证总和为100%
5. **基于50%分位数的动态权重计算**：
   - 按调整后的比例对5个星级从高到低排序
   - 计算累积比例，找到50%分位数所在的星级
   - 根据该星级选择对应的权重调整策略
   - 应用权重调整，计算最终评分
6. 用颜色标识是否进行了调整（绿色=未调整，红色=已调整）

## 文件结构

```
douban-rating-adjuster/
├── manifest.json      # Chrome扩展配置文件
├── content.js         # 内容脚本，负责页面分析和DOM操作
├── content.css        # 样式文件
└── README.md          # 说明文档
```

## 技术实现

- **Manifest V3**: 使用最新的Chrome扩展API
- **内容脚本**: 在豆瓣页面中注入JavaScript代码
- **DOM解析**: 提取页面中的评分比例数据
- **实时监听**: 监听页面变化，支持SPA应用
- **颜色编码**: 用颜色直观显示调整状态

## 注意事项

- 仅在豆瓣电影详情页面生效
- 调整算法基于统计学假设，结果仅供参考
- 不会修改豆瓣服务器数据，仅在本地显示调整结果

## 版本信息

- 版本: 1.0
- 兼容性: Chrome 88+
- 更新日期: 2025年7月

## 贡献

欢迎提交issue和pull request来改进这个项目。

## 许可证

本项目采用MIT许可证。
