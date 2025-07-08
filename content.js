// 豆瓣评分调整器
(function() {
    'use strict';

    // 默认阈值配置
    const CONFIG = {
        n5_to_n4_ratio_threshold: 3.0,  // 5星/4星比例阈值
        n1_to_n2_ratio_threshold: 3.0   // 1星/2星比例阈值
    };

    /**
     * 评分调整算法
     */
    function calculateAdjustedRating(ratingsDict, n5_to_n4_ratio_threshold = 3.0, n1_to_n2_ratio_threshold = 3.0) {
        // 提取各星级比例
        const n = {
            1: ratingsDict['1_star'] || 0,
            2: ratingsDict['2_star'] || 0,
            3: ratingsDict['3_star'] || 0,
            4: ratingsDict['4_star'] || 0,
            5: ratingsDict['5_star'] || 0
        };

        const total_percent = Object.values(n).reduce((sum, percent) => sum + percent, 0);
        if (total_percent === 0) {
            return { score: 0.0, is_adjusted: false, message: "总比例为0，无法计算。" };
        }

        // 区间中值权重
        const weights = { 1: 1.5, 2: 3.5, 3: 5.5, 4: 7.5, 5: 9.5 };
        
        // 复制一份用于调整，保留原始数据
        const adjusted_n = { ...n };
        const adjustment_log = [];

        // --- 2. 数据健康度检查与调整 ---
        
        // 检查5星刷分嫌疑
        // 条件：4星投票数大于0，且5星/4星比例超过阈值，且2星超过5星
        if (n[4] > 0 && (n[5] / n[4]) > n5_to_n4_ratio_threshold && n[2] > n[5]) {
            const original_n5 = n[5];
            adjusted_n[5] = n[4];
            adjustment_log.push(
                `检测到5星评价可能存在水分 (5星/4星比例 > ${n5_to_n4_ratio_threshold} 且5星 > 2星)。\n` +
                `    将用于计算的5星比例从 ${original_n5.toFixed(1)}% 调整为 ${adjusted_n[5].toFixed(1)}%。`
            );
        }

        // 检查1星刷分嫌疑
        // 条件：2星投票数大于0，且1星/2星比例超过阈值，且5星超过2星
        if (n[2] > 0 && (n[1] / n[2]) > n1_to_n2_ratio_threshold && n[5] > n[2]) {
            const original_n1 = n[1];
            adjusted_n[1] = n[2];
            adjustment_log.push(
                `检测到1星评价可能存在恶意刷分 (1星/2星比例 > ${n1_to_n2_ratio_threshold} 且5星 > 2星)。\n` +
                `    将用于计算的1星比例从 ${original_n1.toFixed(1)}% 调整为 ${adjusted_n[1].toFixed(1)}%。`
            );
        }

        const is_adjusted = adjustment_log.length > 0;

        // 如果有调整，重新计算比例使总和为100%
        if (is_adjusted) {
            const current_total = Object.values(adjusted_n).reduce((sum, percent) => sum + percent, 0);
            if (current_total > 0) {
                for (let i = 1; i <= 5; i++) {
                    adjusted_n[i] = (adjusted_n[i] / current_total) * 100;
                }
            }
        }

        // --- 3. 计算最终分数 ---
        
        // 直接用比例加权求和
        const final_score = (adjusted_n[1] * weights[1] + adjusted_n[2] * weights[2] + 
                            adjusted_n[3] * weights[3] + adjusted_n[4] * weights[4] + 
                            adjusted_n[5] * weights[5]) / 100;

        return {
            score: final_score,
            is_adjusted: is_adjusted,
            adjustment_log: adjustment_log,
            original_data: n,
            adjusted_data: adjusted_n,
            total_percent: total_percent
        };
    }

    /**
     * 从页面提取评分数据
     */
    function extractRatingData() {
        try {
            // 获取原始评分
            const originalRatingElement = document.querySelector('.rating_num[property="v:average"]');
            if (!originalRatingElement) {
                console.log('未找到原始评分');
                return null;
            }
            const originalRating = parseFloat(originalRatingElement.textContent);

            // 获取各星级比例
            const ratingItems = document.querySelectorAll('.ratings-on-weight .item');
            if (ratingItems.length !== 5) {
                console.log('评分详情数据不完整');
                return null;
            }

            const ratings = {};
            ratingItems.forEach((item, index) => {
                const percentElement = item.querySelector('.rating_per');
                if (percentElement) {
                    const percent = parseFloat(percentElement.textContent.replace('%', ''));
                    ratings[`${5-index}_star`] = percent;
                }
            });

            return {
                original_rating: originalRating,
                ratings: ratings
            };
        } catch (error) {
            console.error('提取评分数据时出错:', error);
            return null;
        }
    }

    /**
     * 在页面上显示调整后的评分
     */
    function displayAdjustedRating(originalRating, adjustedResult) {
        const ratingElement = document.querySelector('.rating_num[property="v:average"]');
        if (!ratingElement) return;

        // 检查是否已经添加过调整评分
        if (document.querySelector('.adjusted-rating')) {
            return;
        }

        // 创建调整后评分元素
        const adjustedElement = document.createElement('span');
        adjustedElement.className = 'adjusted-rating';
        
        // 根据是否调整设置颜色：绿色=未调整，红色=已调整
        if (adjustedResult.is_adjusted) {
            adjustedElement.classList.add('declined');  // 红色
        } else {
            adjustedElement.classList.add('improved');  // 绿色
        }

        adjustedElement.textContent = adjustedResult.score.toFixed(1);
        
        // 插入到原评分后面
        ratingElement.parentNode.insertBefore(adjustedElement, ratingElement.nextSibling);

        // 如果有调整，显示调整信息
        if (adjustedResult.is_adjusted && adjustedResult.adjustment_log.length > 0) {
            const infoElement = document.createElement('div');
            infoElement.className = 'adjustment-info';
            infoElement.innerHTML = `
                <strong>评分调整说明:</strong>
                <div class="adjustment-log">${adjustedResult.adjustment_log.join('\n\n')}</div>
            `;
            
            // 插入到评分区域下方
            const ratingContainer = document.querySelector('.rating_self');
            if (ratingContainer) {
                ratingContainer.parentNode.insertBefore(infoElement, ratingContainer.nextSibling);
            }
        }
    }

    /**
     * 主函数
     */
    function main() {
        // 检查是否在豆瓣电影详情页
        if (!window.location.href.includes('movie.douban.com/subject/')) {
            return;
        }

        console.log('豆瓣评分调整器启动');

        // 提取评分数据
        const ratingData = extractRatingData();
        if (!ratingData) {
            console.log('无法提取评分数据');
            return;
        }

        console.log('提取的评分数据:', ratingData);

        // 计算调整后的评分
        const adjustedResult = calculateAdjustedRating(
            ratingData.ratings,
            CONFIG.n5_to_n4_ratio_threshold,
            CONFIG.n1_to_n2_ratio_threshold
        );

        console.log('调整结果:', adjustedResult);

        // 显示调整后的评分
        displayAdjustedRating(ratingData.original_rating, adjustedResult);
    }

    // 等待页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    // 监听页面变化（处理SPA路由变化）
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(main, 1000); // 延迟执行，等待页面更新
        }
    }).observe(document, { subtree: true, childList: true });

})();
