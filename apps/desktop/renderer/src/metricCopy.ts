export const assetMetricCopy = {
  actressOverLimitVideos: {
    label: '单人超限影片',
    description: '每位演员超出所属分类“单人影片上限”的影片数之和。',
  },
  actressesOverLimit: {
    label: '单人超限演员',
    description: '影片数超出所属分类“单人影片上限”的演员数。',
  },
  activeNotUpdatedThirtyDays: {
    label: '30 天未扩增',
    description: '现役演员中，资产数量超过 30 天没有增加的人数。',
  },
  tierCapacityOverflow: {
    label: '容量超出',
    description: '该分类影片总数超出“分类影片上限”的部分。',
  },
  actressesAtOrOverLimit: {
    label: '超限 / 预警演员',
    description: '影片数已超过单人上限的演员数；超出 20% 后标记为超限，否则标记为预警。',
  },
  profileNotUpdatedSixMonths: {
    label: '6 个月未扩增',
    description: '资产数量最后一次增加时间早于 6 个月前。',
  },
} as const;
